package com.dropbridge.transfer.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/** Lightweight session row for transfer history (no QR payload). */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransferSummaryResponse {
    private UUID sessionId;
    private String shareCode;
    private String title;
    private String status;
    private String mode;
    private String targetDeviceId;
    private LocalDateTime expiresAt;
    private LocalDateTime createdAt;
}
