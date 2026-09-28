package com.siranaba.backend.dto;
import java.math.BigDecimal;
public record PresentBillResponse(String tenantId, BigDecimal waterCharge, BigDecimal electricityCharge,
    BigDecimal parkingCharge, BigDecimal totalDue, String dueDate, String billingPeriod,
    boolean updatedExistingStatement, boolean unchanged, String statementId, int revision) {}
