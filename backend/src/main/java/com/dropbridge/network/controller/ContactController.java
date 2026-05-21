package com.dropbridge.network.controller;

import com.dropbridge.auth.AuthContext;
import com.dropbridge.common.exception.UnauthorizedException;
import com.dropbridge.network.dto.AddContactRequest;
import com.dropbridge.network.dto.ContactResponse;
import com.dropbridge.network.service.ContactService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/contacts")
@RequiredArgsConstructor
public class ContactController {

    private final ContactService contactService;

    @GetMapping
    public ResponseEntity<List<ContactResponse>> listContacts() {
        UUID userId = requireUserId();
        return ResponseEntity.ok(contactService.listContacts(userId));
    }

    @PostMapping
    public ResponseEntity<ContactResponse> addContact(
            @Valid @RequestBody AddContactRequest request,
            @RequestParam(required = false) String ownerDeviceId) {
        UUID userId = requireUserId();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(contactService.addContact(userId, ownerDeviceId, request));
    }

    @DeleteMapping("/{contactId}")
    public ResponseEntity<Void> removeContact(@PathVariable UUID contactId) {
        UUID userId = requireUserId();
        contactService.removeContact(userId, contactId);
        return ResponseEntity.noContent().build();
    }

    private static UUID requireUserId() {
        return AuthContext.currentUserId()
                .orElseThrow(() -> new UnauthorizedException("Sign in to use My Network."));
    }
}
