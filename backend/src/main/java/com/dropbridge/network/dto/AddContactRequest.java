package com.dropbridge.network.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AddContactRequest {

    @NotBlank
    @Size(max = 80)
    private String name;

    @NotBlank
    @Size(min = 8, max = 8)
    private String pairingCode;
}
