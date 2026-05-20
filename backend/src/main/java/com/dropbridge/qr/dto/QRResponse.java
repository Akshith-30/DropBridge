package com.dropbridge.qr.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response DTO for QR code generation.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QRResponse {
    private String qrCodeBase64;
    private String shareLink;
    private String shareCode;
}
