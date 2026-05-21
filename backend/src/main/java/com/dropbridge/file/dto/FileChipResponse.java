package com.dropbridge.file.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Lightweight file row for history list cards (no download URLs). */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FileChipResponse {
    private String filename;
    private Long size;
    private String mimeType;
}
