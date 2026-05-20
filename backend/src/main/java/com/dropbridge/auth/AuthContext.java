package com.dropbridge.auth;

import com.dropbridge.auth.security.UserPrincipal;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;
import java.util.UUID;

/** Resolve the current authenticated user from the stateless JWT context (if any). */
public final class AuthContext {

    private AuthContext() {}

    public static Optional<UUID> currentUserId() {
        return currentPrincipal().map(UserPrincipal::getId);
    }

    public static Optional<UserPrincipal> currentPrincipal() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal principal) {
            return Optional.of(principal);
        }
        return Optional.empty();
    }
}
