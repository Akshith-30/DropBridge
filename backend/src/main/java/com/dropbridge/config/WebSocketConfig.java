package com.dropbridge.config;

import com.dropbridge.device.PresenceWebSocketHandler;
import com.dropbridge.webrtc.SignalingWebSocketHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketConfigurer {

    private final SignalingWebSocketHandler signalingWebSocketHandler;
    private final PresenceWebSocketHandler presenceWebSocketHandler;

    @Value("${dropbridge.frontend.url}")
    private String frontendUrl;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        String[] origins = {
                frontendUrl,
                DropBridgeCorsProperties.PRODUCTION_FRONTEND_URL,
                DropBridgeCorsProperties.VERCEL_PREVIEW_PATTERN,
                "http://localhost:*",
                "http://127.0.0.1:*",
                "https://localhost:*",
                "https://127.0.0.1:*",
        };
        registry.addHandler(signalingWebSocketHandler, "/ws/signaling")
                .setAllowedOriginPatterns(origins);
        registry.addHandler(presenceWebSocketHandler, "/ws/presence")
                .setAllowedOriginPatterns(origins);
    }
}
