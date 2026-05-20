package com.dropbridge.device.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PresenceMessage {
    private PresenceType type;
    private String deviceId;
    private String pairingCode;
    private String displayName;
    private UUID sessionId;
    private String shareCode;
    private String title;
    private String senderName;
    private String message;
    /** Current online devices (PRESENCE_SYNC on connect) */
    private List<OnlinePeer> onlinePeers;
}
