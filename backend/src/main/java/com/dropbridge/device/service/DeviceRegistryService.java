package com.dropbridge.device.service;

import com.dropbridge.device.model.UserDevice;
import com.dropbridge.device.repository.UserDeviceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DeviceRegistryService {

    private final UserDeviceRepository deviceRepository;

    @Transactional
    public UserDevice upsertForPresence(UUID userId, String deviceId, String displayName) {
        String pairingCode = DevicePresenceHub.derivePairingCode(deviceId);
        String name = displayName != null && !displayName.isBlank() ? displayName.trim() : "DropBridge device";
        if (name.length() > 80) {
            name = name.substring(0, 80);
        }

        UserDevice device = deviceRepository.findById(deviceId).orElse(null);
        if (device == null) {
            device = UserDevice.builder()
                    .id(deviceId)
                    .userId(userId)
                    .deviceName(name)
                    .pairingCode(pairingCode)
                    .build();
        } else {
            device.setUserId(userId);
            device.setDeviceName(name);
            device.setPairingCode(pairingCode);
        }
        return deviceRepository.save(device);
    }

    @Transactional(readOnly = true)
    public Optional<UUID> findUserIdForDevice(String deviceId) {
        if (deviceId == null || deviceId.isBlank()) {
            return Optional.empty();
        }
        return deviceRepository.findById(deviceId.trim()).map(UserDevice::getUserId);
    }

    @Transactional(readOnly = true)
    public List<UserDevice> listDevicesForUser(UUID userId) {
        return deviceRepository.findByUserIdOrderByLastSeenAtDesc(userId);
    }

    @Transactional(readOnly = true)
    public Optional<UserDevice> findByPairingCode(String pairingCode) {
        if (pairingCode == null || pairingCode.isBlank()) {
            return Optional.empty();
        }
        return deviceRepository.findByPairingCode(pairingCode.trim().toUpperCase());
    }
}
