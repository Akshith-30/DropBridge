package com.dropbridge.transfer.service;

import com.dropbridge.qr.service.QRCodeService;
import com.dropbridge.transfer.model.TransferSession;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.util.Optional;
import java.util.UUID;

/**
 * Sends transfer download links by email (HTML).
 * When SMTP is not configured (local dev), links are logged only.
 */
@Service
@Slf4j
public class TransferNotificationService {

    private final QRCodeService qrCodeService;
    private final Optional<JavaMailSender> mailSender;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Value("${dropbridge.mail.from:${spring.mail.username:}}")
    private String mailFrom;

    public TransferNotificationService(
            QRCodeService qrCodeService,
            @Autowired(required = false) JavaMailSender mailSender) {
        this.qrCodeService = qrCodeService;
        this.mailSender = Optional.ofNullable(mailSender);
    }

    public void sendDownloadLink(TransferSession session, String frontendOrigin) {
        String email = session.getRecipientEmail();
        if (email == null || email.isBlank()) return;

        String link = qrCodeService.getShareLink(session.getId(), frontendOrigin);
        doSend(session.getId(), email, link);
    }

    public void sendDownloadLink(UUID sessionId, String email, String frontendOrigin) {
        if (email == null || email.isBlank()) return;
        String link = qrCodeService.getShareLink(sessionId, frontendOrigin);
        doSend(sessionId, email, link);
    }

    private void doSend(UUID sessionId, String to, String link) {
        if (mailFrom == null || mailFrom.isBlank() || mailSender.isEmpty()) {
            log.info("[EMAIL-STUB] Download link for session {} → {}: {}", sessionId, to, link);
            return;
        }

        try {
            JavaMailSender sender = mailSender.get();
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(mailFrom);
            helper.setTo(to);
            helper.setSubject("Your DropBridge file is ready");
            helper.setText(buildHtmlBody(link), true);

            sender.send(message);
            log.info("Download link email sent for session {} to {}", sessionId, to);
        } catch (MessagingException e) {
            log.error("Failed to send email for session {} to {}: {}", sessionId, to, e.getMessage());
        }
    }

    private String buildHtmlBody(String link) {
        return """
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                       background: #0f0f13; color: #e0e0e0; margin: 0; padding: 40px; }
                .card { background: #1a1a24; border-radius: 16px; padding: 40px;
                        max-width: 500px; margin: 0 auto; border: 1px solid rgba(255,255,255,0.08); }
                h1 { font-size: 24px; color: #ffffff; margin-bottom: 8px; }
                p  { color: #a0a0b0; line-height: 1.6; }
                .btn { display: inline-block; background: linear-gradient(135deg, #7c3aed, #4f46e5);
                       color: #ffffff; text-decoration: none; padding: 14px 32px;
                       border-radius: 10px; font-weight: 600; margin: 24px 0; }
                .note { font-size: 13px; color: #606070; margin-top: 24px; }
              </style>
            </head>
            <body>
              <div class="card">
                <h1>📦 Your file is ready</h1>
                <p>Someone shared a file with you via DropBridge. Click the button below to download it.</p>
                <a href="%s" class="btn">Download File</a>
                <p class="note">This link expires in 24 hours. If the button doesn't work, copy this URL:<br>
                <a href="%s" style="color:#7c3aed;">%s</a></p>
              </div>
            </body>
            </html>
            """.formatted(link, link, link);
    }
}
