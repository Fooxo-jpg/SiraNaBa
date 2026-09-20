package com.siranaba.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequest(
        @NotBlank String currentPassword,
        @NotBlank @Size(min = 8, message = "must be at least 8 characters") String newPassword,
        @NotBlank String confirmPassword
) {
    public boolean newMatchesConfirm() {
        return newPassword != null && newPassword.equals(confirmPassword);
    }
}
