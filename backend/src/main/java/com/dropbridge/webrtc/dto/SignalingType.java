package com.dropbridge.webrtc.dto;

public enum SignalingType {
    JOIN,
    PEER_JOINED,
    OFFER,
    ANSWER,
    ICE_CANDIDATE,
    PEER_LEFT,
    RECEIVER_ACK,
    DEVICE_INFO,
    ERROR
}
