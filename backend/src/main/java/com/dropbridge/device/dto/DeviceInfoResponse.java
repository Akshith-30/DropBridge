package com.dropbridge.device.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeviceInfoResponse {
    private String deviceId;
    private String pairingCode;
    private String displayName;
    private boolean online;
}
