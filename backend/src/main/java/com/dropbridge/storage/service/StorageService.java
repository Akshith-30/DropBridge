package com.dropbridge.storage.service;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

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
}
