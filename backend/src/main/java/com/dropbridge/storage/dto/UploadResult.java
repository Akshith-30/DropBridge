package com.dropbridge.storage.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Result DTO returned after a file is stored.
 * Encapsulates storage metadata for the calling service.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UploadResult {
    private String storageKey;
    private String storageType;
    private long sizeBytes;
}
