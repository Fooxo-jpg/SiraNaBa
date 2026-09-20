package com.siranaba.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank @Email String email,
        @NotBlank String password,
        /** "Remember this device for 30 days" checkbox. Optional; null means false. */
        Boolean remember
) {
    public boolean rememberMe() {
        return Boolean.TRUE.equals(remember);
    }
}
