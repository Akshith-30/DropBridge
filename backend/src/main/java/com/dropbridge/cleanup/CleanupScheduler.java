package com.dropbridge.cleanup;

import com.dropbridge.file.service.FileService;
import com.dropbridge.transfer.model.TransferSession;
import com.dropbridge.transfer.model.TransferStatus;
import com.dropbridge.transfer.repository.TransferSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class CleanupScheduler {

    private final TransferSessionRepository sessionRepository;
    private final FileService fileService;

    /**
     * Runs every hour to clean up expired sessions and their associated files.
     */
    @Scheduled(fixedRate = 3600000) // 1 hour in milliseconds
    @Transactional
    public void cleanupExpiredSessions() {
        log.info("Starting cleanup of expired sessions...");

        List<TransferSession> expiredSessions = sessionRepository
                .findByExpiresAtBeforeAndStatusNot(LocalDateTime.now(), TransferStatus.EXPIRED);

        int cleanedCount = 0;
        for (TransferSession session : expiredSessions) {
            try {
                // Delete associated files from storage and database
                fileService.deleteFilesBySession(session.getId());

                // Mark session as expired
                session.setStatus(TransferStatus.EXPIRED);
                sessionRepository.save(session);

                cleanedCount++;
            } catch (Exception e) {
                log.error("Failed to clean up session: {}", session.getId(), e);
            }
        }

        log.info("Cleanup completed. Cleaned {} expired sessions.", cleanedCount);
    }
}
