package com.dropbridge.webrtc;

import com.dropbridge.transfer.repository.TransferSessionRepository;
import com.dropbridge.webrtc.dto.SignalingMessage;
import com.dropbridge.webrtc.dto.SignalingType;
import com.dropbridge.webrtc.service.SignalingHub;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class SignalingWebSocketHandler extends TextWebSocketHandler {

    private static final String SESSION_ID_ATTR = "sessionId";
    private static final String CONNECTION_ID_ATTR = "connectionId";
    private static final String ROLE_ATTR = "role";

    private final SignalingHub signalingHub;
    private final TransferSessionRepository sessionRepository;
    private final ObjectMapper objectMapper;

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String sessionIdParam = getQueryParam(session, "sessionId");
        String role = getQueryParam(session, "role");

        if (sessionIdParam == null || role == null) {
            signalingHub.sendError(session, "Missing sessionId or role query parameter");
            session.close(CloseStatus.BAD_DATA);
            return;
        }

        UUID sessionId;
        try {
            sessionId = UUID.fromString(sessionIdParam);
        } catch (IllegalArgumentException ex) {
            signalingHub.sendError(session, "Invalid sessionId");
            session.close(CloseStatus.BAD_DATA);
            return;
        }

        if (!sessionRepository.existsById(sessionId)) {
            signalingHub.sendError(session, "Transfer session not found");
            session.close(CloseStatus.BAD_DATA);
            return;
        }

        if (!role.equals("sender") && !role.equals("receiver")) {
            signalingHub.sendError(session, "Role must be sender or receiver");
            session.close(CloseStatus.BAD_DATA);
            return;
        }

        String connectionId = UUID.randomUUID().toString();
        session.getAttributes().put(SESSION_ID_ATTR, sessionId);
        session.getAttributes().put(CONNECTION_ID_ATTR, connectionId);
        session.getAttributes().put(ROLE_ATTR, role);

        signalingHub.register(sessionId, connectionId, role, session);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        UUID sessionId = (UUID) session.getAttributes().get(SESSION_ID_ATTR);
        String connectionId = (String) session.getAttributes().get(CONNECTION_ID_ATTR);

        if (sessionId == null || connectionId == null) {
            signalingHub.sendError(session, "Not registered");
            return;
        }

        SignalingMessage signalingMessage = objectMapper.readValue(message.getPayload(), SignalingMessage.class);
        SignalingType type = signalingMessage.getType();

        if (type == null) {
            signalingHub.sendError(session, "Missing message type");
            return;
        }

        switch (type) {
            case OFFER, ANSWER, ICE_CANDIDATE, RECEIVER_ACK, DEVICE_INFO ->
                    signalingHub.relay(sessionId, connectionId, signalingMessage);
            case JOIN -> {
                // Already registered on connect; acknowledge only
                log.debug("Join ack for session {}", sessionId);
            }
            default -> signalingHub.sendError(session, "Unsupported signaling message: " + type);
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        UUID sessionId = (UUID) session.getAttributes().get(SESSION_ID_ATTR);
        String connectionId = (String) session.getAttributes().get(CONNECTION_ID_ATTR);

        if (sessionId != null && connectionId != null) {
            signalingHub.remove(sessionId, connectionId);
        }
    }

    private String getQueryParam(WebSocketSession session, String name) {
        String query = session.getUri() != null ? session.getUri().getQuery() : null;
        if (query == null) {
            return null;
        }
        for (String part : query.split("&")) {
            String[] kv = part.split("=", 2);
            if (kv.length == 2 && kv[0].equals(name)) {
                return kv[1];
            }
        }
        return null;
    }
}
