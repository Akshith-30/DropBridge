package com.dropbridge.device.service;

import com.dropbridge.device.dto.OnlinePeer;
import com.dropbridge.device.dto.PresenceMessage;
import com.dropbridge.device.dto.PresenceType;
import com.dropbridge.device.model.UserDevice;
import com.dropbridge.network.model.UserContact;
import com.dropbridge.network.repository.UserContactRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.CloseStatus;
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
    private final UserContactRepository contactRepository;
    private final DeviceRegistryService deviceRegistry;

    private record DeviceRegistration(
            String deviceId,
            String displayName,
            String pairingCode,
            WebSocketSession session,
            UUID userId) {}

    private final Map<String, DeviceRegistration> byDeviceId = new ConcurrentHashMap<>();
    private final Map<String, String> deviceIdByPairingCode = new ConcurrentHashMap<>();
    /** Remember pairing codes so contacts stay valid when a device is temporarily offline */
    private final Map<String, String> rememberedDeviceIdByPairingCode = new ConcurrentHashMap<>();
    /** Delivered when a device connects to presence after being offline during notify */
    private final Map<String, List<PresenceMessage>> pendingIncomingByDeviceId = new ConcurrentHashMap<>();

    public static String derivePairingCode(String deviceId) {
        return deviceId.replace("-", "").substring(0, 8).toUpperCase();
    }

    public void register(String deviceId, String displayName, WebSocketSession session, UUID userId)
            throws IOException {
        String pairingCode = derivePairingCode(deviceId);
        String name = displayName != null && !displayName.isBlank() ? displayName.trim() : "DropBridge device";

        supersedePreviousSession(deviceId, session);

        DeviceRegistration registration = new DeviceRegistration(deviceId, name, pairingCode, session, userId);
        byDeviceId.put(deviceId, registration);
        deviceIdByPairingCode.put(pairingCode, deviceId);
        rememberedDeviceIdByPairingCode.put(pairingCode, deviceId);

        if (userId != null) {
            deviceRegistry.upsertForPresence(userId, deviceId, name);
        }

        log.info("Device online: {} ({}) id={} user={}", name, pairingCode, deviceId, userId);

        send(session, PresenceMessage.builder()
                .type(PresenceType.REGISTERED)
                .deviceId(deviceId)
                .pairingCode(pairingCode)
                .displayName(name)
                .build());

        flushPendingIncoming(deviceId, session);
        sendPresenceSync(session, deviceId, userId);
        if (userId != null) {
            notifyWatchersDeviceOnline(deviceId, name, userId);
        }
    }

    /**
     * Only removes registration when the closing session is still the active one for this device.
     * Prevents a superseded/replaced connection from marking the device offline while a newer tab reconnects.
     */
    public void unregister(String deviceId, WebSocketSession closingSession, boolean notify) throws IOException {
        DeviceRegistration current = byDeviceId.get(deviceId);
        if (current == null) {
            return;
        }
        if (closingSession != null && !current.session().getId().equals(closingSession.getId())) {
            log.debug("Ignoring stale presence close for device {}", deviceId);
            return;
        }
        DeviceRegistration removed = byDeviceId.remove(deviceId);
        if (removed != null) {
            deviceIdByPairingCode.remove(removed.pairingCode());
            log.info("Device offline: {}", removed.displayName());
            if (notify && removed.userId() != null) {
                notifyWatchersDeviceOffline(deviceId, removed.userId());
            }
        }
    }

    private void supersedePreviousSession(String deviceId, WebSocketSession newSession) {
        DeviceRegistration previous = byDeviceId.get(deviceId);
        if (previous == null) {
            return;
        }
        WebSocketSession old = previous.session();
        if (old.getId().equals(newSession.getId())) {
            return;
        }
        if (old.isOpen()) {
            try {
                old.close(CloseStatus.GOING_AWAY);
            } catch (IOException ex) {
                log.debug("Could not close superseded presence session for {}: {}", deviceId, ex.getMessage());
            }
        }
    }

    /** Signed-in presence only — guest sockets do not count as online for contacts. */
    public boolean isOnline(String deviceId) {
        DeviceRegistration reg = byDeviceId.get(deviceId);
        return reg != null && reg.userId() != null && reg.session().isOpen();
    }

    public Optional<UUID> resolveDeviceUserId(String deviceId) {
        DeviceRegistration reg = byDeviceId.get(deviceId);
        if (reg != null && reg.userId() != null) {
            return Optional.of(reg.userId());
        }
        return deviceRegistry.findUserIdForDevice(deviceId);
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
        if (deviceId != null) {
            final String resolvedId = deviceId;
            DeviceRegistration reg = byDeviceId.get(resolvedId);
            if (reg != null) {
                return Optional.of(new DeviceInfo(
                        reg.deviceId(),
                        reg.pairingCode(),
                        reg.displayName(),
                        reg.session().isOpen(),
                        reg.userId()));
            }
            return deviceRegistry
                    .findUserIdForDevice(resolvedId)
                    .map(userId -> new DeviceInfo(
                            resolvedId,
                            normalized,
                            "DropBridge device",
                            false,
                            userId));
        }
        return deviceRegistry.findByPairingCode(normalized).map(d -> new DeviceInfo(
                d.getId(),
                d.getPairingCode(),
                d.getDeviceName(),
                isOnline(d.getId()),
                d.getUserId()));
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

    private void send(WebSocketSession session, PresenceMessage message) {
        if (!session.isOpen()) {
            return;
        }
        try {
            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(message)));
        } catch (IOException ex) {
            log.debug("Presence send failed for session {}: {}", session.getId(), ex.getMessage());
        }
    }

    /**
     * Online devices for each contact user (all devices per person, not one device per contact row).
     */
    private void sendPresenceSync(WebSocketSession session, String excludeDeviceId, UUID userId)
            throws IOException {
        List<OnlinePeer> peers;
        if (userId == null) {
            peers = List.of();
        } else {
            peers = new ArrayList<>();
            for (UserContact contact : contactRepository.findByOwnerUserIdOrderByAddedAtDesc(userId)) {
                for (UserDevice device : deviceRegistry.listDevicesForUser(contact.getContactUserId())) {
                    if (device.getId().equals(excludeDeviceId)) {
                        continue;
                    }
                    DeviceRegistration reg = byDeviceId.get(device.getId());
                    if (reg != null && reg.userId() != null && reg.session().isOpen()) {
                        peers.add(OnlinePeer.builder()
                                .deviceId(reg.deviceId())
                                .displayName(reg.displayName())
                                .build());
                    }
                }
            }
        }
        send(session, PresenceMessage.builder()
                .type(PresenceType.PRESENCE_SYNC)
                .onlinePeers(peers)
                .build());
    }

    private void notifyWatchersDeviceOnline(String deviceId, String displayName, UUID contactUserId) {
        PresenceMessage message = PresenceMessage.builder()
                .type(PresenceType.DEVICE_ONLINE)
                .deviceId(deviceId)
                .displayName(displayName)
                .build();
        broadcastToWatchers(contactUserId, deviceId, message);
    }

    private void notifyWatchersDeviceOffline(String deviceId, UUID contactUserId) {
        PresenceMessage message = PresenceMessage.builder()
                .type(PresenceType.DEVICE_OFFLINE)
                .deviceId(deviceId)
                .build();
        broadcastToWatchers(contactUserId, deviceId, message);
    }

    private void broadcastToWatchers(UUID contactUserId, String eventDeviceId, PresenceMessage message) {
        List<UUID> watchers = contactRepository.findOwnerUserIdsWatchingUser(contactUserId);
        if (watchers.isEmpty()) {
            return;
        }
        for (DeviceRegistration reg : byDeviceId.values()) {
            if (reg.deviceId().equals(eventDeviceId)) {
                continue;
            }
            if (reg.userId() == null || !watchers.contains(reg.userId())) {
                continue;
            }
            send(reg.session(), message);
        }
    }

    public record DeviceInfo(
            String deviceId, String pairingCode, String displayName, boolean online, UUID userId) {}
}
