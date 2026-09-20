package com.siranaba.backend.dto;

/** Never includes the password. `emailSent` is false when mail isn't configured or failed. */
public record RegisterTenantResponse(
        String tenantId,
        String email,
        double monthlyRent,
        String rentDueDate,
        boolean emailSent,
        String emailMessage
) {
}
