package com.dropbridge.file.repository;

import com.dropbridge.file.model.TransferFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface FileRepository extends JpaRepository<TransferFile, UUID> {

    List<TransferFile> findBySessionId(UUID sessionId);
}
