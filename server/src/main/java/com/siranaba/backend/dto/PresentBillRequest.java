package com.siranaba.backend.dto;
import java.math.BigDecimal;
import jakarta.validation.constraints.*;
public record PresentBillRequest(@NotNull @DecimalMin("0") BigDecimal waterUsage,
    @NotNull @DecimalMin("0") BigDecimal waterRate, @NotNull @DecimalMin("0") BigDecimal electricityUsage,
    BigDecimal electricityRate, boolean parkingFee, @NotBlank String billingPeriod,
    @NotBlank String dueDate, boolean reissue, Integer expectedRevision) {}
