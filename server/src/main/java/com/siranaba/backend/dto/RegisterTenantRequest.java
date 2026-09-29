package com.siranaba.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * Sent by the admin portal's "Register New Tenant" form. There is deliberately no
 * building, rent or password field: the room identifies the single building and
 * unit type, rent comes from the server price list, and the password is generated securely.
 */
public record RegisterTenantRequest(
        @NotBlank String fullName,
        @NotBlank @Email String email,
        String phone,
        @NotBlank String roomId,
        /** ISO date (yyyy-MM-dd). */
        @NotBlank String leaseStart
) {
}
