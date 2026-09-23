package com.siranaba.backend.dto;

/** Confirmation returned after management creates or updates a tenant statement. */
public record PresentBillResponse(
        String tenantId,
        double waterCharge,
        double electricityCharge,
        double parkingCharge,
        double totalDue,
        String dueDate,
        String billingPeriod,
        boolean updatedExistingStatement,
        boolean unchanged
) {
}
