package com.dropbridge.device.service;

import com.dropbridge.device.dto.OnlinePeer;
import com.dropbridge.device.dto.PresenceMessage;
import com.dropbridge.device.dto.PresenceType;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
@RequiredArgsConstructor
@Slf4j
public class DevicePresenceHub {

    private final ObjectMapper objectMapper;

    private record DeviceRegistration(
            String deviceId,
            String displayName,
            String pairingCode,
            WebSocketSession session) {}

    private final Map<String, DeviceRegistration> byDeviceId = new ConcurrentHashMap<>();
    private final Map<String, String> deviceIdByPairingCode = new ConcurrentHashMap<>();
    /** Remember pairing codes so contacts stay valid when a device is temporarily offline */
    private final Map<String, String> rememberedDeviceIdByPairingCode = new ConcurrentHashMap<>();
    /** Delivered when a device connects to presence after being offline during notify */
    private final Map<String, List<PresenceMessage>> pendingIncomingByDeviceId = new ConcurrentHashMap<>();

    public static String derivePairingCode(String deviceId) {
        return deviceId.replace("-", "").substring(0, 8).toUpperCase();
    }

    public void register(String deviceId, String displayName, WebSocketSession session) throws IOException {
        String pairingCode = derivePairingCode(deviceId);
        String name = displayName != null && !displayName.isBlank() ? displayName.trim() : "DropBridge device";

        unregister(deviceId, false);

        DeviceRegistration registration = new DeviceRegistration(deviceId, name, pairingCode, session);
        byDeviceId.put(deviceId, registration);
        deviceIdByPairingCode.put(pairingCode, deviceId);
        rememberedDeviceIdByPairingCode.put(pairingCode, deviceId);

        log.info("Device online: {} ({}) id={}", name, pairingCode, deviceId);

        send(session, PresenceMessage.builder()
                .type(PresenceType.REGISTERED)
                .deviceId(deviceId)
                .pairingCode(pairingCode)
                .displayName(name)
                .build());

        flushPendingIncoming(deviceId, session);
        sendPresenceSync(session, deviceId);
        broadcastDeviceOnline(deviceId, name);
    }

    public void unregister(String deviceId, boolean notify) throws IOException {
        DeviceRegistration removed = byDeviceId.remove(deviceId);
        if (removed != null) {
            deviceIdByPairingCode.remove(removed.pairingCode());
            log.info("Device offline: {}", removed.displayName());
            if (notify) {
                broadcastDeviceOffline(deviceId);
            }
        }
    }

    public boolean isOnline(String deviceId) {
        DeviceRegistration reg = byDeviceId.get(deviceId);
        return reg != null && reg.session().isOpen();
    }

    public Optional<DeviceInfo> resolvePairingCode(String pairingCode) {
        if (pairingCode == null || pairingCode.isBlank()) {
            return Optional.empty();
        }
        String normalized = pairingCode.trim().toUpperCase();
        String deviceId = deviceIdByPairingCode.get(normalized);
        if (deviceId == null) {
            deviceId = rememberedDeviceIdByPairingCode.get(normalized);
        }
        if (deviceId == null) {
            return Optional.empty();
        }
        DeviceRegistration reg = byDeviceId.get(deviceId);
        if (reg != null) {
            return Optional.of(new DeviceInfo(
                    reg.deviceId(),
                    reg.pairingCode(),
                    reg.displayName(),
                    reg.session().isOpen()));
        }
        return Optional.of(new DeviceInfo(
                deviceId,
                normalized,
                "DropBridge device",
                false));
    }

    public boolean notifyIncomingTransfer(
            String targetDeviceId,
            UUID sessionId,
            String shareCode,
            String title,
            String senderName) throws IOException {

        PresenceMessage message = PresenceMessage.builder()
                .type(PresenceType.INCOMING_TRANSFER)
                .sessionId(sessionId)
                .shareCode(shareCode)
                .title(title)
                .senderName(senderName)
                .build();

        DeviceRegistration target = byDeviceId.get(targetDeviceId);
        if (target == null || !target.session().isOpen()) {
            queuePendingIncoming(targetDeviceId, message);
            log.info("Target device {} not on presence — queued incoming transfer {}", targetDeviceId, sessionId);
            return false;
        }

        send(target.session(), message);
        log.info("Notified device {} of incoming transfer {}", target.displayName(), sessionId);
        return true;
    }

    private void queuePendingIncoming(String deviceId, PresenceMessage message) {
        pendingIncomingByDeviceId
                .computeIfAbsent(deviceId, ignored -> new CopyOnWriteArrayList<>())
                .add(message);
    }

    private void flushPendingIncoming(String deviceId, WebSocketSession session) throws IOException {
        List<PresenceMessage> pending = pendingIncomingByDeviceId.remove(deviceId);
        if (pending == null || pending.isEmpty()) {
            return;
        }
        log.info("Delivering {} pending incoming transfer(s) to device {}", pending.size(), deviceId);
        for (PresenceMessage message : new ArrayList<>(pending)) {
            if (message.getSessionId() != null) {
                send(session, message);
            }
        }
    }

    private void send(WebSocketSession session, PresenceMessage message) throws IOException {
        if (session.isOpen()) {
            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(message)));
        }
    }

    /** Tell a newly connected client which devices are already online. */
    private void sendPresenceSync(WebSocketSession session, String excludeDeviceId) throws IOException {
        List<OnlinePeer> peers = byDeviceId.values().stream()
                .filter(reg -> !reg.deviceId().equals(excludeDeviceId) && reg.session().isOpen())
                .map(reg -> OnlinePeer.builder()
                        .deviceId(reg.deviceId())
                        .displayName(reg.displayName())
                        .build())
                .toList();
        if (peers.isEmpty()) {
            return;
        }
        send(session, PresenceMessage.builder()
                .type(PresenceType.PRESENCE_SYNC)
                .onlinePeers(peers)
                .build());
    }

    private void broadcastDeviceOnline(String deviceId, String displayName) {
        PresenceMessage message = PresenceMessage.builder()
                .type(PresenceType.DEVICE_ONLINE)
                .deviceId(deviceId)
                .displayName(displayName)
                .build();
        broadcastExcept(deviceId, message);
    }

    private void broadcastDeviceOffline(String deviceId) {
        PresenceMessage message = PresenceMessage.builder()
                .type(PresenceType.DEVICE_OFFLINE)
                .deviceId(deviceId)
                .build();
        broadcastExcept(deviceId, message);
    }

    private void broadcastExcept(String excludeDeviceId, PresenceMessage message) {
        for (DeviceRegistration reg : byDeviceId.values()) {
            if (reg.deviceId().equals(excludeDeviceId)) {
                continue;
            }
            try {
                send(reg.session(), message);
            } catch (IOException ex) {
                log.debug("Could not broadcast presence to {}: {}", reg.deviceId(), ex.getMessage());
            }
        }
    }

    public record DeviceInfo(String deviceId, String pairingCode, String displayName, boolean online) {}
}
