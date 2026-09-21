package com.siranaba.backend.dto;

/** Confirmation returned after management publishes a new tenant statement. */
public record PresentBillResponse(
        String tenantId,
        double waterCharge,
        double electricityCharge,
        double parkingCharge,
        double totalDue,
        String dueDate
) {
}
