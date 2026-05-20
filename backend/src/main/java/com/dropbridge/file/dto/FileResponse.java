package com.dropbridge.file.dto;

import com.dropbridge.file.model.TransferFile;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FileResponse {
    private UUID id;
    private UUID sessionId;
    private String filename;
    private String mimeType;
    private Long size;
    private String storageType;

    /**
     * Factory method to create a FileResponse from a TransferFile entity.
     * Controllers should use this instead of exposing entities directly.
     */
    public static FileResponse from(TransferFile file) {
        return FileResponse.builder()
                .id(file.getId())
                .sessionId(file.getSessionId())
                .filename(file.getFilename())
                .mimeType(file.getMimeType())
                .size(file.getSize())
                .storageType(file.getStorageType())
                .build();
    }
}
