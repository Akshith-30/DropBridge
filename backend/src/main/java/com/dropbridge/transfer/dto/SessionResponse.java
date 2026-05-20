package com.dropbridge.transfer.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SessionResponse {
    private UUID sessionId;
    private String shareCode;
    private String title;
    private String recipientEmail;
    private String status;
    private String mode;
    private String senderDeviceId;
    private String senderDisplayName;
    private String targetDeviceId;
    /** True when the target device was online and received a push notification */
    private Boolean targetNotified;
    private String qrCode;
    private String shareLink;
    private LocalDateTime expiresAt;
    private LocalDateTime createdAt;
}
