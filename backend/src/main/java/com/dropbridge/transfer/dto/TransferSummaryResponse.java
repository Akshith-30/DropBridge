package com.dropbridge.transfer.dto;

import com.dropbridge.file.dto.FileChipResponse;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
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
    private String senderDisplayName;
    private Long fileCount;
    private Long totalSizeBytes;
    private List<FileChipResponse> files;
    private LocalDateTime expiresAt;
    private LocalDateTime createdAt;
}
