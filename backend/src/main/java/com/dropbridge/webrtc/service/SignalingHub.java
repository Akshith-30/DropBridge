package com.dropbridge.webrtc.service;

import com.dropbridge.webrtc.dto.SignalingMessage;
import com.dropbridge.webrtc.dto.SignalingType;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class SignalingHub {

    private final ObjectMapper objectMapper;

    /** sessionId -> (connectionId -> WebSocketSession) */
    private final Map<UUID, Map<String, PeerConnection>> rooms = new ConcurrentHashMap<>();

    /** Last SDP offer per session — replay to receivers who connect after sender created offer */
    private final Map<UUID, SignalingMessage> lastOfferBySession = new ConcurrentHashMap<>();

    public record PeerConnection(String connectionId, String role, WebSocketSession session) {}

    public void register(UUID sessionId, String connectionId, String role, WebSocketSession session)
            throws IOException {
        rooms.computeIfAbsent(sessionId, id -> new ConcurrentHashMap<>())
                .put(connectionId, new PeerConnection(connectionId, role, session));

        log.info("Signaling peer joined session {} as {} ({})", sessionId, role, connectionId);

        broadcastToOthers(sessionId, connectionId, SignalingMessage.builder()
                .type(SignalingType.PEER_JOINED)
                .sessionId(sessionId)
                .role(role)
                .build());

        // Tell the newcomer about peers already in the room (e.g. receiver opened link before sender)
        Map<String, PeerConnection> room = rooms.get(sessionId);
        if (room != null) {
            for (Map.Entry<String, PeerConnection> entry : room.entrySet()) {
                if (entry.getKey().equals(connectionId)) {
                    continue;
                }
                sendTo(session, SignalingMessage.builder()
                        .type(SignalingType.PEER_JOINED)
                        .sessionId(sessionId)
                        .role(entry.getValue().role())
                        .build());
            }
        }

        if ("receiver".equals(role)) {
            SignalingMessage cachedOffer = lastOfferBySession.get(sessionId);
            if (cachedOffer != null && session.isOpen()) {
                log.info("Replaying cached offer to receiver for session {}", sessionId);
                session.sendMessage(new TextMessage(objectMapper.writeValueAsString(cachedOffer)));
            }
        }
    }

    public void relay(UUID sessionId, String fromConnectionId, SignalingMessage message) throws IOException {
        message.setSessionId(sessionId);
        if (message.getType() == SignalingType.OFFER) {
            lastOfferBySession.put(sessionId, message);
        }
        broadcastToOthers(sessionId, fromConnectionId, message);
    }

    public void remove(UUID sessionId, String connectionId) throws IOException {
        Map<String, PeerConnection> room = rooms.get(sessionId);
        if (room == null) {
            return;
        }

        PeerConnection removed = room.remove(connectionId);
        if (removed != null) {
            log.info("Signaling peer left session {} ({})", sessionId, connectionId);
            broadcastToOthers(sessionId, connectionId, SignalingMessage.builder()
                    .type(SignalingType.PEER_LEFT)
                    .sessionId(sessionId)
                    .role(removed.role())
                    .build());
        }

        if (room.isEmpty()) {
            rooms.remove(sessionId);
            lastOfferBySession.remove(sessionId);
        }
    }

    public int peerCount(UUID sessionId) {
        Map<String, PeerConnection> room = rooms.get(sessionId);
        return room == null ? 0 : room.size();
    }

    private void broadcastToOthers(UUID sessionId, String fromConnectionId, SignalingMessage message)
            throws IOException {
        Map<String, PeerConnection> room = rooms.get(sessionId);
        if (room == null) {
            return;
        }

        String payload = objectMapper.writeValueAsString(message);
        TextMessage textMessage = new TextMessage(payload);

        for (Map.Entry<String, PeerConnection> entry : room.entrySet()) {
            if (entry.getKey().equals(fromConnectionId)) {
                continue;
            }
            WebSocketSession target = entry.getValue().session();
            if (target.isOpen()) {
                target.sendMessage(textMessage);
            }
        }
    }

    private void sendTo(WebSocketSession session, SignalingMessage message) throws IOException {
        if (session.isOpen()) {
            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(message)));
        }
    }

    public void sendError(WebSocketSession session, String errorMessage) throws IOException {
        SignalingMessage error = SignalingMessage.builder()
                .type(SignalingType.ERROR)
                .message(errorMessage)
                .build();
        session.sendMessage(new TextMessage(objectMapper.writeValueAsString(error)));
    }
}
