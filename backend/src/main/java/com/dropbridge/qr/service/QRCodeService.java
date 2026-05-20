package com.dropbridge.qr.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;

@Service
public class QRCodeService {

    @Value("${dropbridge.frontend.url}")
    private String frontendUrl;

    /**
     * Generates a QR code as a Base64-encoded PNG string for a given session ID.
     */
    public String generateQRCode(UUID sessionId) {
        return generateQRCode(sessionId, null);
    }

    public String generateQRCode(UUID sessionId, String frontendOrigin) {
        String url = getShareLink(sessionId, frontendOrigin);
        return generateQRCodeFromUrl(url);
    }

    /**
     * Generates a QR code image from a URL string and returns it as a Base64 PNG.
     */
    private String generateQRCodeFromUrl(String url) {
        try {
            QRCodeWriter qrCodeWriter = new QRCodeWriter();
            Map<EncodeHintType, Object> hints = Map.of(
                    EncodeHintType.MARGIN, 1,
                    EncodeHintType.CHARACTER_SET, "UTF-8"
            );

            BitMatrix bitMatrix = qrCodeWriter.encode(url, BarcodeFormat.QR_CODE, 300, 300, hints);

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(bitMatrix, "PNG", outputStream);

            return "data:image/png;base64," + Base64.getEncoder().encodeToString(outputStream.toByteArray());
        } catch (WriterException | IOException e) {
            throw new RuntimeException("Failed to generate QR code", e);
        }
    }

    /**
     * Returns the share link URL for a given session ID.
     */
    public String getShareLink(UUID sessionId) {
        return getShareLink(sessionId, null);
    }

    public String getShareLink(UUID sessionId, String frontendOrigin) {
        String base = resolveBaseUrl(frontendOrigin);
        return base + "/receive/" + sessionId;
    }

    private String resolveBaseUrl(String frontendOrigin) {
        if (frontendOrigin != null && !frontendOrigin.isBlank()) {
            return frontendOrigin.replaceAll("/$", "");
        }
        return frontendUrl.replaceAll("/$", "");
    }
}
