package com.dropbridge.transfer.repository;

import com.dropbridge.transfer.model.TransferSession;
import com.dropbridge.transfer.model.TransferStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TransferSessionRepository extends JpaRepository<TransferSession, UUID> {

    Optional<TransferSession> findByShareCode(String shareCode);

    List<TransferSession> findByExpiresAtBeforeAndStatusNot(LocalDateTime dateTime, TransferStatus status);

    List<TransferSession> findByStatus(TransferStatus status);

    List<TransferSession> findBySenderUserIdOrderByCreatedAtDesc(UUID senderUserId, Pageable pageable);

    List<TransferSession> findByReceiverUserIdOrderByCreatedAtDesc(UUID receiverUserId, Pageable pageable);
}
