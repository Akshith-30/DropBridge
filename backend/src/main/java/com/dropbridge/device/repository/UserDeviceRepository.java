package com.dropbridge.device.repository;

import com.dropbridge.device.model.UserDevice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserDeviceRepository extends JpaRepository<UserDevice, String> {

    List<UserDevice> findByUserIdOrderByLastSeenAtDesc(UUID userId);

    Optional<UserDevice> findByPairingCode(String pairingCode);

    Optional<UserDevice> findByUserIdAndId(UUID userId, String id);
}
