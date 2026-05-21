package com.dropbridge.transfer.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "transfer_sessions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransferSession {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "share_code", unique = true, nullable = false, length = 6)
    private String shareCode;

    @Column(length = 120)
    private String title;

    @Column(name = "recipient_email", length = 255)
    private String recipientEmail;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TransferStatus status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TransferMode mode;

    @Column(name = "sender_user_id")
    private UUID senderUserId;

    @Column(name = "receiver_user_id")
    private UUID receiverUserId;

    @Column(name = "sender_device_id", length = 36)
    private String senderDeviceId;

    @Column(name = "sender_display_name", length = 80)
    private String senderDisplayName;

    @Column(name = "target_device_id", length = 36)
    private String targetDeviceId;

    @Column(name = "target_notified")
    private Boolean targetNotified;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
