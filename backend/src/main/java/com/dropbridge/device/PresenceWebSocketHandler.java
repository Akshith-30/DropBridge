package com.dropbridge.device;

import com.dropbridge.device.dto.PresenceMessage;
import com.dropbridge.device.service.DevicePresenceHub;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;

@Component
@RequiredArgsConstructor
@Slf4j
public class PresenceWebSocketHandler extends TextWebSocketHandler {

    private static final String DEVICE_ID_ATTR = "deviceId";

    private final DevicePresenceHub devicePresenceHub;
    private final ObjectMapper objectMapper;

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String deviceId = getQueryParam(session, "deviceId");
        String displayName = getQueryParam(session, "displayName");

        if (deviceId == null || deviceId.isBlank()) {
            session.close(CloseStatus.BAD_DATA);
            return;
        }

        deviceId = URLDecoder.decode(deviceId, StandardCharsets.UTF_8);

        if (displayName != null) {
            displayName = URLDecoder.decode(displayName, StandardCharsets.UTF_8);
        }

        session.getAttributes().put(DEVICE_ID_ATTR, deviceId);
        devicePresenceHub.register(deviceId, displayName, session);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        String deviceId = (String) session.getAttributes().get(DEVICE_ID_ATTR);
        if (deviceId != null) {
            devicePresenceHub.unregister(deviceId, true);
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        // Presence channel is server-push only for now
        log.debug("Ignoring client presence message: {}", message.getPayload());
    }

    private String getQueryParam(WebSocketSession session, String name) {
        String query = session.getUri() != null ? session.getUri().getQuery() : null;
        if (query == null) {
            return null;
        }
        for (String part : query.split("&")) {
            String[] kv = part.split("=", 2);
            if (kv.length >= 1 && kv[0].equals(name)) {
                return kv.length == 2 ? kv[1] : "";
            }
        }
        return null;
    }
}
