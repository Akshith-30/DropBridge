package com.dropbridge.network.service;

import com.dropbridge.common.exception.BadRequestException;
import com.dropbridge.common.exception.ResourceNotFoundException;
import com.dropbridge.device.model.UserDevice;
import com.dropbridge.device.service.DevicePresenceHub;
import com.dropbridge.device.service.DeviceRegistryService;
import com.dropbridge.network.dto.AddContactRequest;
import com.dropbridge.network.dto.ContactDeviceResponse;
import com.dropbridge.network.dto.ContactResponse;
import com.dropbridge.network.model.UserContact;
import com.dropbridge.network.repository.UserContactRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ContactService {

    private final UserContactRepository contactRepository;
    private final DevicePresenceHub devicePresenceHub;
    private final DeviceRegistryService deviceRegistry;

    @Transactional(readOnly = true)
    public List<ContactResponse> listContacts(UUID ownerUserId) {
        return contactRepository.findByOwnerUserIdOrderByAddedAtDesc(ownerUserId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public ContactResponse addContact(UUID ownerUserId, String ownerDeviceId, AddContactRequest request) {
        String code = normalizePairingCode(request.getPairingCode());
        String name = request.getName().trim();
        if (name.isEmpty()) {
            throw new BadRequestException("Contact name is required.");
        }

        DevicePresenceHub.DeviceInfo device = devicePresenceHub
                .resolvePairingCode(code)
                .or(() -> deviceRegistry.findByPairingCode(code).map(this::deviceInfoFromRegistry))
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Device not found. They must have DropBridge open while signed in, then try their code again."));

        UUID contactUserId = device.userId();
        if (contactUserId == null) {
            throw new BadRequestException(
                    "That device is not signed in. Ask them to open DropBridge while logged in, then try again.");
        }

        if (ownerUserId.equals(contactUserId)) {
            throw new BadRequestException("You cannot add yourself to your network.");
        }

        if (ownerDeviceId != null && ownerDeviceId.equalsIgnoreCase(device.deviceId())) {
            throw new BadRequestException("You cannot add your own device to your network.");
        }

        if (contactRepository.existsByOwnerUserIdAndContactUserId(ownerUserId, contactUserId)) {
            throw new BadRequestException("This person is already in your network.");
        }

        UserContact contact = UserContact.builder()
                .ownerUserId(ownerUserId)
                .contactUserId(contactUserId)
                .nickname(name.length() > 80 ? name.substring(0, 80) : name)
                .build();

        return toResponse(contactRepository.save(contact));
    }

    @Transactional
    public void removeContact(UUID ownerUserId, UUID contactId) {
        UserContact contact = contactRepository
                .findByIdAndOwnerUserId(contactId, ownerUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Contact not found."));
        contactRepository.delete(contact);
    }

    @Transactional(readOnly = true)
    public boolean isInNetwork(UUID ownerUserId, String targetDeviceId) {
        if (targetDeviceId == null || targetDeviceId.isBlank()) {
            return false;
        }
        UUID deviceOwner = devicePresenceHub
                .resolveDeviceUserId(targetDeviceId.trim())
                .or(() -> deviceRegistry.findUserIdForDevice(targetDeviceId.trim()))
                .orElse(null);
        if (deviceOwner == null) {
            return false;
        }
        return contactRepository.existsByOwnerUserIdAndContactUserId(ownerUserId, deviceOwner);
    }

    public List<UUID> watchersForUser(UUID contactUserId) {
        return contactRepository.findOwnerUserIdsWatchingUser(contactUserId);
    }

    private ContactResponse toResponse(UserContact contact) {
        List<UserDevice> devices = deviceRegistry.listDevicesForUser(contact.getContactUserId());
        List<ContactDeviceResponse> deviceResponses = new ArrayList<>();
        int onlineCount = 0;
        for (UserDevice d : devices) {
            boolean online = devicePresenceHub.isOnline(d.getId());
            if (online) {
                onlineCount++;
            }
            deviceResponses.add(ContactDeviceResponse.builder()
                    .deviceId(d.getId())
                    .deviceName(d.getDeviceName())
                    .pairingCode(d.getPairingCode())
                    .online(online)
                    .build());
        }
        return ContactResponse.builder()
                .id(contact.getId())
                .userId(contact.getContactUserId())
                .name(contact.getNickname())
                .online(onlineCount > 0)
                .onlineDeviceCount(onlineCount)
                .devices(deviceResponses)
                .addedAt(contact.getAddedAt())
                .build();
    }

    private DevicePresenceHub.DeviceInfo deviceInfoFromRegistry(UserDevice device) {
        boolean online = devicePresenceHub.isOnline(device.getId());
        return new DevicePresenceHub.DeviceInfo(
                device.getId(),
                device.getPairingCode(),
                device.getDeviceName(),
                online,
                device.getUserId());
    }

    private static String normalizePairingCode(String pairingCode) {
        if (pairingCode == null) {
            return "";
        }
        return pairingCode.replaceAll("\\s", "").toUpperCase();
    }
}
