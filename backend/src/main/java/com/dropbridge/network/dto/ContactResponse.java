package com.dropbridge.network.dto;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Value
@Builder
public class ContactResponse {
    UUID id;
    UUID userId;
    String name;
    boolean online;
    int onlineDeviceCount;
    List<ContactDeviceResponse> devices;
    LocalDateTime addedAt;
}
