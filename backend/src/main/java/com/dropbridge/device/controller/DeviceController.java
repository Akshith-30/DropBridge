package com.dropbridge.device.controller;

import com.dropbridge.device.dto.DeviceInfoResponse;
import com.dropbridge.device.service.DevicePresenceHub;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/devices")
@RequiredArgsConstructor
public class DeviceController {

    private final DevicePresenceHub devicePresenceHub;

    /**
     * GET /api/devices/resolve/{pairingCode} — Look up a device by its 8-character pairing code
     */
    @GetMapping("/resolve/{pairingCode}")
    public ResponseEntity<DeviceInfoResponse> resolvePairingCode(@PathVariable String pairingCode) {
        return devicePresenceHub.resolvePairingCode(pairingCode)
                .map(info -> ResponseEntity.ok(DeviceInfoResponse.builder()
                        .deviceId(info.deviceId())
                        .pairingCode(info.pairingCode())
                        .displayName(info.displayName())
                        .online(info.online())
                        .build()))
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * GET /api/devices/{deviceId}/online — Check if a known device is currently connected
     */
    @GetMapping("/{deviceId}/online")
    public ResponseEntity<Boolean> isOnline(@PathVariable String deviceId) {
        return ResponseEntity.ok(devicePresenceHub.isOnline(deviceId));
    }
}
