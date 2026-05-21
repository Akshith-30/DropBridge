package com.dropbridge.storage.service;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

import java.time.Duration;
import java.util.Optional;

public interface StorageService {

    /**
     * Store a file and return the storage key.
     */
    String store(MultipartFile file, String subdirectory);

    /**
     * Load a file as a Resource by its storage key.
     */
    Resource load(String storageKey);

    /**
     * Delete a file by its storage key.
     */
    void delete(String storageKey);

    /**
     * Presigned GET URL for direct browser download/preview (R2). Empty for local disk storage.
     */
    default Optional<String> createPresignedDownloadUrl(
            String storageKey, String filename, Duration ttl) {
        return Optional.empty();
    }
}
