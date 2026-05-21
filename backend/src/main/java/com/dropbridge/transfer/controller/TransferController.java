package com.dropbridge.transfer.controller;

import com.dropbridge.auth.AuthContext;
import com.dropbridge.common.exception.UnauthorizedException;
import com.dropbridge.transfer.dto.CreateTransferRequest;
import com.dropbridge.transfer.dto.SessionResponse;
import com.dropbridge.file.dto.SessionFileAccessResponse;
import com.dropbridge.file.service.FileService;
import com.dropbridge.transfer.dto.TransferSummaryResponse;
import com.dropbridge.transfer.model.TransferStatus;
import com.dropbridge.transfer.service.TransferService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/transfers")
@RequiredArgsConstructor
public class TransferController {

    private final TransferService transferService;
    private final FileService fileService;

    /**
     * GET /api/transfers/mine/sent — Sessions you started while signed in.
     */
    @GetMapping({"/mine", "/mine/sent"})
    public ResponseEntity<List<TransferSummaryResponse>> listSentSessions() {
        UUID userId = AuthContext.currentUserId()
                .orElseThrow(() -> new UnauthorizedException("Sign in to see send history."));
        return ResponseEntity.ok(transferService.listSentSessions(userId));
    }

    /**
     * GET /api/transfers/mine/received — Sessions you joined while signed in.
     */
    @GetMapping("/mine/received")
    public ResponseEntity<List<TransferSummaryResponse>> listReceivedSessions() {
        UUID userId = AuthContext.currentUserId()
                .orElseThrow(() -> new UnauthorizedException("Sign in to see receive history."));
        return ResponseEntity.ok(transferService.listReceivedSessions(userId));
    }

    /**
     * GET /api/transfers/{sessionId}/files — Cloud file list with presigned URLs (15 min).
     */
    @GetMapping("/{sessionId}/files")
    public ResponseEntity<List<SessionFileAccessResponse>> listSessionFiles(@PathVariable UUID sessionId) {
        UUID userId = AuthContext.currentUserId()
                .orElseThrow(() -> new UnauthorizedException("Sign in to access transfer files."));
        return ResponseEntity.ok(fileService.listSessionFilesForUser(sessionId, userId));
    }

    /**
     * POST /api/transfers — Create a new transfer session
     */
    @PostMapping
    public ResponseEntity<SessionResponse> createSession(
            @RequestBody(required = false) CreateTransferRequest request,
            @RequestHeader(value = "X-Frontend-Origin", required = false) String frontendOrigin) {
        SessionResponse response = transferService.createSession(frontendOrigin, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * GET /api/transfers/{id} — Get session details
     */
    @GetMapping("/{id}")
    public ResponseEntity<SessionResponse> getSession(@PathVariable UUID id) {
        SessionResponse response = transferService.getSession(id);
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/transfers/{id}/join — Join a session by UUID
     */
    @PostMapping("/{id}/join")
    public ResponseEntity<SessionResponse> joinSession(@PathVariable UUID id) {
        SessionResponse response = transferService.joinById(id);
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/transfers/join/{shareCode} — Join a session by share code
     */
    @PostMapping("/join/{shareCode}")
    public ResponseEntity<SessionResponse> joinByCode(@PathVariable String shareCode) {
        SessionResponse response = transferService.joinByShareCode(shareCode);
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/transfers/{id}/finalize-cloud — Mark cloud session ready after all files uploaded
     */
    @PostMapping("/{id}/finalize-cloud")
    public ResponseEntity<SessionResponse> finalizeCloud(@PathVariable UUID id) {
        return ResponseEntity.ok(transferService.finalizeCloudUpload(id));
    }

    /**
     * POST /api/transfers/{id}/notify — Queue download link email to recipient (CLOUD)
     */
    @PostMapping("/{id}/notify")
    public ResponseEntity<Void> notifyRecipient(
            @PathVariable UUID id,
            @RequestHeader(value = "X-Frontend-Origin", required = false) String frontendOrigin) {
        transferService.notifyRecipient(id, frontendOrigin);
        return ResponseEntity.ok().build();
    }

    /**
     * PUT /api/transfers/{id}/status — Update session status
     */
    @PutMapping("/{id}/status")
    public ResponseEntity<SessionResponse> updateStatus(
            @PathVariable UUID id,
            @RequestParam TransferStatus status) {
        SessionResponse response = transferService.updateStatus(id, status);
        return ResponseEntity.ok(response);
    }
}
