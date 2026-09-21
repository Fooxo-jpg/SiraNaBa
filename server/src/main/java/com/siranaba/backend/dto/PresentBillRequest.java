package com.siranaba.backend.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

/** Meter readings and the approved per-unit rates used to issue a tenant statement. */
public record PresentBillRequest(
        @NotNull @DecimalMin("0.0") Double waterUsage,
        @NotNull @DecimalMin("0.0") Double waterRate,
        @NotNull @DecimalMin("0.0") Double electricityUsage,
        @NotNull @DecimalMin("0.0") Double electricityRate,
        boolean parkingFee
) {
}
