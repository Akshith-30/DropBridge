package com.dropbridge.transfer.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Request body for POST /api/transfers */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateTransferRequest {
    /** Optional label shown to sender and receiver */
    private String title;
    /** P2P (direct) or CLOUD (temporary storage) */
    private String mode;
    /** How long the file stays available (1–168 hours). Used for CLOUD; optional for P2P. */
    private Integer storageHours;
    /** Optional — send download link to this address (CLOUD transfers) */
    private String recipientEmail;
    /** This device's id (P2P known-contact sends) */
    private String senderDeviceId;
    /** Shown to the recipient when notified */
    private String senderDisplayName;
    /** Known contact device id — push incoming transfer if online (P2P only) */
    private String targetDeviceId;
}
