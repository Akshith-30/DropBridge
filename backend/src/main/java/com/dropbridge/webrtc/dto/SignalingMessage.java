package com.dropbridge.webrtc.dto;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SignalingMessage {
    private SignalingType type;
    private UUID sessionId;
    private String role;
    private JsonNode sdp;
    private JsonNode candidate;
    private String message;
    private String deviceId;
    private String displayName;
}
