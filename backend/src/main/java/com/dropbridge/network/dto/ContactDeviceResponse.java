package com.dropbridge.network.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class ContactDeviceResponse {
    String deviceId;
    String deviceName;
    String pairingCode;
    boolean online;
}
