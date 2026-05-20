package com.dropbridge.transfer.service;

import com.dropbridge.auth.AuthContext;
import com.dropbridge.common.exception.ResourceNotFoundException;
import com.dropbridge.device.service.DevicePresenceHub;
import com.dropbridge.file.repository.FileRepository;
import com.dropbridge.qr.service.QRCodeService;
import com.dropbridge.transfer.dto.CreateTransferRequest;
import com.dropbridge.transfer.dto.SessionResponse;
import com.dropbridge.transfer.dto.TransferSummaryResponse;
import com.dropbridge.transfer.model.TransferMode;
import com.dropbridge.transfer.model.TransferSession;
import com.dropbridge.transfer.model.TransferStatus;
import com.dropbridge.transfer.repository.TransferSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class TransferService {

    private final TransferSessionRepository sessionRepository;
    private final FileRepository fileRepository;
    private final DevicePresenceHub devicePresenceHub;
    private final QRCodeService qrCodeService;
    private final TransferNotificationService notificationService;

    @Value("${dropbridge.session.expiration-hours}")
    private int expirationHours;

    @Value("${dropbridge.transfer.history-page-size:50}")
    private int historyPageSize;

    private static final String SHARE_CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final int SHARE_CODE_LENGTH = 6;
    private final SecureRandom random = new SecureRandom();

    /**
     * Creates a new transfer session with a unique share code and QR code.
     */
    @Transactional
    public SessionResponse createSession() {
        return createSession(null);
    }

    @Transactional
    public SessionResponse createSession(String frontendOrigin) {
        return createSession(frontendOrigin, null);
    }

    @Transactional
    public SessionResponse createSession(String frontendOrigin, CreateTransferRequest request) {
        String shareCode = generateShareCode();

        String trimmedTitle = null;
        String recipientEmail = null;
        String senderDeviceId = null;
        String senderDisplayName = null;
        String targetDeviceId = null;
        TransferMode mode = TransferMode.P2P;
        int hours = expirationHours;

        if (request != null) {
            if (request.getTitle() != null && !request.getTitle().isBlank()) {
                trimmedTitle = request.getTitle().trim();
                if (trimmedTitle.length() > 120) {
                    trimmedTitle = trimmedTitle.substring(0, 120);
                }
            }
            if (request.getMode() != null && "CLOUD".equalsIgnoreCase(request.getMode().trim())) {
                mode = TransferMode.CLOUD;
            }
            if (request.getStorageHours() != null) {
                hours = Math.max(1, Math.min(168, request.getStorageHours()));
            } else if (mode == TransferMode.CLOUD) {
                hours = 72;
            }
            if (request.getRecipientEmail() != null && !request.getRecipientEmail().isBlank()) {
                recipientEmail = request.getRecipientEmail().trim().toLowerCase();
                if (recipientEmail.length() > 255) {
                    recipientEmail = recipientEmail.substring(0, 255);
                }
            }
            if (request.getSenderDeviceId() != null && !request.getSenderDeviceId().isBlank()) {
                senderDeviceId = request.getSenderDeviceId().trim();
            }
            if (request.getSenderDisplayName() != null && !request.getSenderDisplayName().isBlank()) {
                senderDisplayName = request.getSenderDisplayName().trim();
                if (senderDisplayName.length() > 80) {
                    senderDisplayName = senderDisplayName.substring(0, 80);
                }
            }
            if (request.getTargetDeviceId() != null && !request.getTargetDeviceId().isBlank()) {
                targetDeviceId = request.getTargetDeviceId().trim();
            }
        }

        UUID senderUserId = AuthContext.currentUserId().orElse(null);
        if (senderDisplayName == null || senderDisplayName.isBlank()) {
            senderDisplayName = AuthContext.currentPrincipal()
                    .map(p -> {
                        if (p.getDisplayName() != null && !p.getDisplayName().isBlank()) {
                            return p.getDisplayName();
                        }
                        return p.getEmail();
                    })
                    .orElse(null);
        }

        TransferSession session = TransferSession.builder()
                .shareCode(shareCode)
                .title(trimmedTitle)
                .recipientEmail(recipientEmail)
                .senderUserId(senderUserId)
                .senderDeviceId(senderDeviceId)
                .senderDisplayName(senderDisplayName)
                .targetDeviceId(targetDeviceId)
                .status(TransferStatus.PENDING)
                .mode(mode)
                .expiresAt(LocalDateTime.now().plusHours(hours))
                .build();

        // Persist first so session.getId() exists for presence notifications
        session = sessionRepository.save(session);

        Boolean targetNotified = null;
        if (mode == TransferMode.P2P && targetDeviceId != null) {
            try {
                targetNotified = devicePresenceHub.notifyIncomingTransfer(
                        targetDeviceId,
                        session.getId(),
                        shareCode,
                        trimmedTitle,
                        senderDisplayName != null ? senderDisplayName : "Someone");
            } catch (Exception ex) {
                log.warn("Could not notify target device {}: {}", targetDeviceId, ex.getMessage());
                targetNotified = false;
            }
            session.setTargetNotified(targetNotified);
            session = sessionRepository.save(session);
        }
        log.info("Created transfer session: {} code={} mode={}", session.getId(), shareCode, mode);

        return buildSessionResponse(session, frontendOrigin);
    }

    /**
     * Recent transfer sessions created while signed in (sender_user_id set).
     */
    @Transactional(readOnly = true)
    public List<TransferSummaryResponse> listMySessions(UUID userId) {
        int size = Math.min(100, Math.max(1, historyPageSize));
        return sessionRepository
                .findBySenderUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, size))
                .stream()
                .map(this::toSummary)
                .toList();
    }

    /**
     * Retrieves a session by its UUID.
     */
    public SessionResponse getSession(UUID sessionId) {
        TransferSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found: " + sessionId));

        return buildSessionResponse(session);
    }

    /**
     * Joins a session by its share code, updating status to CONNECTING.
     */
    @Transactional
    public SessionResponse joinByShareCode(String shareCode) {
        TransferSession session = sessionRepository.findByShareCode(shareCode.toUpperCase())
                .orElseThrow(() -> new ResourceNotFoundException("Session not found with code: " + shareCode));

        validateReceiverCanJoin(session);
        return registerReceiverJoin(session);
    }

    /**
     * Joins a session by its UUID.
     */
    @Transactional
    public SessionResponse joinById(UUID sessionId) {
        TransferSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found: " + sessionId));

        validateReceiverCanJoin(session);
        return registerReceiverJoin(session);
    }

    private SessionResponse registerReceiverJoin(TransferSession session) {
        if (session.getMode() == TransferMode.CLOUD && sessionHasFiles(session.getId())) {
            if (session.getStatus() != TransferStatus.COMPLETED) {
                session.setStatus(TransferStatus.TRANSFERRING);
                session = sessionRepository.save(session);
            }
            log.info("Receiver accessing cloud session: {}", session.getId());
            return buildSessionResponse(session);
        }

        session.setStatus(TransferStatus.CONNECTING);
        session = sessionRepository.save(session);
        log.info("Receiver joined session: {}", session.getId());
        return buildSessionResponse(session);
    }

    /**
     * Updates the status of a session.
     */
    /**
     * Marks a cloud session ready for download after all files have been uploaded.
     */
    @Transactional
    public SessionResponse finalizeCloudUpload(UUID sessionId) {
        TransferSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found: " + sessionId));

        if (session.getMode() != TransferMode.CLOUD) {
            throw new IllegalStateException("Only cloud sessions can be finalized this way");
        }
        if (session.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalStateException("Session has expired");
        }
        if (!sessionHasFiles(sessionId)) {
            throw new IllegalStateException("Upload at least one file before finalizing");
        }

        session.setStatus(TransferStatus.READY);
        session = sessionRepository.save(session);
        log.info("Cloud session {} finalized with file(s) ready for download", sessionId);
        return buildSessionResponse(session);
    }

    public void notifyRecipient(UUID sessionId, String frontendOrigin) {
        TransferSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found: " + sessionId));
        notificationService.sendDownloadLink(session, frontendOrigin);
    }

    @Transactional
    public SessionResponse updateStatus(UUID sessionId, TransferStatus newStatus) {
        TransferSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found: " + sessionId));

        session.setStatus(newStatus);
        session = sessionRepository.save(session);
        log.info("Session {} status updated to {}", sessionId, newStatus);

        return buildSessionResponse(session);
    }

    private void validateReceiverCanJoin(TransferSession session) {
        if (session.getExpiresAt().isBefore(LocalDateTime.now())) {
            session.setStatus(TransferStatus.EXPIRED);
            sessionRepository.save(session);
            throw new IllegalStateException("Session has expired");
        }

        if (session.getStatus() == TransferStatus.EXPIRED) {
            throw new IllegalStateException("Session has expired");
        }

        if (session.getStatus() == TransferStatus.FAILED) {
            throw new IllegalStateException("Session is no longer active");
        }

        if (session.getMode() == TransferMode.CLOUD) {
            if (sessionHasFiles(session.getId())) {
                return;
            }
            if (session.getStatus() == TransferStatus.PENDING || session.getStatus() == TransferStatus.CONNECTING) {
                throw new IllegalStateException("File is still uploading. Try again in a moment.");
            }
            throw new IllegalStateException("Session is not ready for download yet");
        }

        // Direct P2P finished — cannot join again
        if (session.getStatus() == TransferStatus.COMPLETED) {
            throw new IllegalStateException("Session is no longer active");
        }
    }

    private boolean sessionHasFiles(UUID sessionId) {
        return !fileRepository.findBySessionId(sessionId).isEmpty();
    }

    private SessionResponse buildSessionResponse(TransferSession session) {
        return buildSessionResponse(session, null);
    }

    private SessionResponse buildSessionResponse(TransferSession session, String frontendOrigin) {
        return SessionResponse.builder()
                .sessionId(session.getId())
                .shareCode(session.getShareCode())
                .title(session.getTitle())
                .recipientEmail(session.getRecipientEmail())
                .status(session.getStatus().name())
                .mode(session.getMode().name())
                .senderDeviceId(session.getSenderDeviceId())
                .senderDisplayName(session.getSenderDisplayName())
                .targetDeviceId(session.getTargetDeviceId())
                .targetNotified(session.getTargetNotified())
                .qrCode(qrCodeService.generateQRCode(session.getId(), frontendOrigin))
                .shareLink(qrCodeService.getShareLink(session.getId(), frontendOrigin))
                .expiresAt(session.getExpiresAt())
                .createdAt(session.getCreatedAt())
                .build();
    }

    private TransferSummaryResponse toSummary(TransferSession session) {
        return TransferSummaryResponse.builder()
                .sessionId(session.getId())
                .shareCode(session.getShareCode())
                .title(session.getTitle())
                .status(session.getStatus().name())
                .mode(session.getMode().name())
                .targetDeviceId(session.getTargetDeviceId())
                .expiresAt(session.getExpiresAt())
                .createdAt(session.getCreatedAt())
                .build();
    }

    private String generateShareCode() {
        StringBuilder sb = new StringBuilder(SHARE_CODE_LENGTH);
        for (int i = 0; i < SHARE_CODE_LENGTH; i++) {
            sb.append(SHARE_CODE_CHARS.charAt(random.nextInt(SHARE_CODE_CHARS.length())));
        }

        String code = sb.toString();
        if (sessionRepository.findByShareCode(code).isPresent()) {
            return generateShareCode();
        }
        return code;
    }
}
