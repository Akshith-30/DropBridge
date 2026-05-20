package com.dropbridge.transfer.model;

public enum TransferStatus {
    PENDING,
    CONNECTING,
    TRANSFERRING,
    /** Cloud file uploaded — waiting for recipient to download */
    READY,
    /** P2P delivery confirmed, or download finished */
    COMPLETED,
    FAILED,
    EXPIRED
}
