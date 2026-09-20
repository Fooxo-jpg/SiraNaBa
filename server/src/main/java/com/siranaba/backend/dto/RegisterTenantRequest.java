package com.siranaba.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * Sent by the admin portal's "Register New Tenant" form. There is deliberately no
 * rent or password field: rent comes from the server's unit-type price list and
 * the initial password is derived from the name, tower and unit.
 */
public record RegisterTenantRequest(
        @NotBlank String fullName,
        @NotBlank @Email String email,
        String phone,
        @NotBlank String roomId,
        @Min(1) @Max(99) int tower,
        /** Room number as shown on the map, e.g. "402" or "PH25". */
        @NotBlank @Pattern(regexp = "[A-Za-z0-9-]{1,10}") String unit,
        /** Studio | One-Bedroom | Two-Bedroom | Penthouse */
        @NotBlank String unitType,
        /** ISO date (yyyy-MM-dd). */
        @NotBlank String leaseStart
) {
}
