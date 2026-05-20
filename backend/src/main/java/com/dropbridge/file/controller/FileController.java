package com.dropbridge.file.controller;

import com.dropbridge.file.dto.FileResponse;
import com.dropbridge.file.model.TransferFile;
import com.dropbridge.file.service.FileService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileController {

    private final FileService fileService;

    /**
     * POST /api/files/upload/{sessionId} — Upload a file to a session
     */
    @PostMapping("/upload/{sessionId}")
    public ResponseEntity<FileResponse> uploadFile(
            @PathVariable UUID sessionId,
            @RequestParam("file") MultipartFile file) {

        FileResponse response = fileService.uploadFile(sessionId, file);
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/files/session/{sessionId} — Get all files for a session
     */
    @GetMapping("/session/{sessionId}")
    public ResponseEntity<List<FileResponse>> getFilesBySession(@PathVariable UUID sessionId) {
        List<FileResponse> files = fileService.getFilesBySession(sessionId);
        return ResponseEntity.ok(files);
    }

    /**
     * GET /api/files/{id}/download — Download a file
     */
    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> downloadFile(@PathVariable UUID id) {
        TransferFile transferFile = fileService.getFileEntity(id);
        Resource resource = fileService.downloadFile(id);

        String contentType = transferFile.getMimeType() != null
                ? transferFile.getMimeType()
                : "application/octet-stream";

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + transferFile.getFilename() + "\"")
                .body(resource);
    }
}
