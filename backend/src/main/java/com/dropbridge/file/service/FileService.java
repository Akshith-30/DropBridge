package com.dropbridge.file.service;

import com.dropbridge.common.exception.BadRequestException;
import com.dropbridge.common.exception.ResourceNotFoundException;
import com.dropbridge.file.dto.FileResponse;
import com.dropbridge.file.model.TransferFile;
import com.dropbridge.file.repository.FileRepository;
import com.dropbridge.storage.service.StorageService;
import com.dropbridge.transfer.model.TransferMode;
import com.dropbridge.transfer.model.TransferSession;
import com.dropbridge.transfer.model.TransferStatus;
import com.dropbridge.transfer.repository.TransferSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.util.unit.DataSize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class FileService {

    private static final List<String> ALLOWED_MIME_PREFIXES = List.of(
            "image/",
            "video/",
            "audio/",
            "text/",
            "application/pdf",
            "application/zip",
            "application/x-zip-compressed",
            "application/x-rar-compressed",
            "application/msword",
            "application/vnd.openxmlformats-officedocument",
            "application/vnd.ms-excel",
            "application/vnd.ms-powerpoint",
            "application/json",
            "application/octet-stream"
    );

    private final FileRepository fileRepository;
    private final TransferSessionRepository sessionRepository;
    private final StorageService storageService;

    @Value("${dropbridge.upload.strict-mime-validation:false}")
    private boolean strictMimeValidation;

    @Value("${dropbridge.upload.max-files-per-session:50}")
    private int maxFilesPerSession;

    @Value("${dropbridge.upload.max-session-size:1GB}")
    private DataSize maxSessionSize;

    /**
     * Uploads a file to a specific transfer session.
     */
    @Transactional
    public FileResponse uploadFile(UUID sessionId, MultipartFile file) {
        TransferSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found: " + sessionId));

        if (session.getExpiresAt().isBefore(LocalDateTime.now())) {
            session.setStatus(TransferStatus.EXPIRED);
            sessionRepository.save(session);
            throw new IllegalStateException("Session has expired");
        }

        if (session.getStatus() == TransferStatus.EXPIRED) {
            throw new IllegalStateException("Session has expired");
        }
        if (session.getStatus() == TransferStatus.COMPLETED) {
            throw new IllegalStateException("This session is already completed");
        }

        List<TransferFile> existing = fileRepository.findBySessionId(sessionId);
        int cap = Math.max(1, Math.min(100, maxFilesPerSession));
        if (existing.size() >= cap) {
            throw new IllegalStateException("Maximum " + cap + " files per transfer.");
        }

        validateSessionTotalSize(existing, file.getSize());

        validateMimeIfStrict(file);

        // Store the file on disk
        String storageKey = storageService.store(file, sessionId.toString());

        // Save file metadata to database
        TransferFile transferFile = TransferFile.builder()
                .sessionId(sessionId)
                .filename(file.getOriginalFilename())
                .mimeType(file.getContentType())
                .size(file.getSize())
                .storageType("TEMP_CLOUD")
                .storageKey(storageKey)
                .build();

        transferFile = fileRepository.save(transferFile);

        // More files may follow; caller finalizes when all uploads are done
        if (session.getStatus() == TransferStatus.PENDING) {
            session.setStatus(TransferStatus.TRANSFERRING);
            sessionRepository.save(session);
        }

        log.info("File uploaded: {} ({} bytes) to session {}", file.getOriginalFilename(), file.getSize(), sessionId);

        return FileResponse.from(transferFile);
    }

    /**
     * Get all files for a session.
     */
    public List<FileResponse> getFilesBySession(UUID sessionId) {
        sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found: " + sessionId));

        return fileRepository.findBySessionId(sessionId).stream()
                .map(FileResponse::from)
                .collect(Collectors.toList());
    }

    /**
     * Load a file resource for download.
     */
    public Resource downloadFile(UUID fileId) {
        TransferFile transferFile = fileRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException("File not found: " + fileId));

        TransferSession session = sessionRepository.findById(transferFile.getSessionId())
                .orElseThrow(() -> new ResourceNotFoundException("Session not found: " + transferFile.getSessionId()));

        Resource resource = storageService.load(transferFile.getStorageKey());

        if (session.getMode() == TransferMode.CLOUD && session.getStatus() != TransferStatus.COMPLETED) {
            session.setStatus(TransferStatus.COMPLETED);
            sessionRepository.save(session);
            log.info("Cloud download completed for session {}", session.getId());
        }

        return resource;
    }

    /**
     * Get file entity for download metadata.
     */
    public TransferFile getFileEntity(UUID fileId) {
        return fileRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException("File not found: " + fileId));
    }

    /**
     * Delete all files associated with a session.
     */
    @Transactional
    public void deleteFilesBySession(UUID sessionId) {
        List<TransferFile> files = fileRepository.findBySessionId(sessionId);
        for (TransferFile file : files) {
            storageService.delete(file.getStorageKey());
            fileRepository.delete(file);
        }
        log.info("Deleted {} files for session {}", files.size(), sessionId);
    }

    private void validateSessionTotalSize(List<TransferFile> existing, long newFileSize) {
        long maxBytes = maxSessionSize.toBytes();
        if (newFileSize > maxBytes) {
            throw new BadRequestException(
                    "A single transfer cannot exceed " + maxSessionSize + " in total.");
        }
        long existingTotal = existing.stream().mapToLong(TransferFile::getSize).sum();
        if (existingTotal + newFileSize > maxBytes) {
            throw new BadRequestException(
                    "Total transfer size cannot exceed " + maxSessionSize
                            + " for this session. Remove files or upload a smaller batch.");
        }
    }

    private void validateMimeIfStrict(MultipartFile file) {
        if (!strictMimeValidation) {
            return;
        }
        String mime = file.getContentType();
        if (mime == null || mime.isBlank()) {
            return;
        }
        String lower = mime.toLowerCase(Locale.ROOT).trim();
        boolean ok = ALLOWED_MIME_PREFIXES.stream().anyMatch(lower::startsWith);
        if (!ok) {
            throw new BadRequestException("This file type is not allowed for cloud upload.");
        }
    }
}
