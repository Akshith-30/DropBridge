package com.dropbridge.file.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/** File with time-limited URLs for preview/download in history detail panel. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SessionFileAccessResponse {
    private UUID id;
    private String filename;
    private Long size;
    private String mimeType;
    private String previewUrl;
    private String downloadUrl;
}
