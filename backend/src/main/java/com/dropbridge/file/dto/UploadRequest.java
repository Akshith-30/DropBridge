package com.dropbridge.file.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for file upload metadata.
 * Currently unused for MVP (multipart handles file data).
 * Will be extended in Phase 2 for chunked uploads, metadata, etc.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UploadRequest {
    private String filename;
    private String mimeType;
    private Long size;
}
