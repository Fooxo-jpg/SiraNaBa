package com.siranaba.backend.dto;

import com.siranaba.backend.model.Billing;

import java.util.List;

/** Everything the admin can see about one tenant's payments. Card numbers and CVVs are never stored, so none appear. */
public record TenantPaymentsResponse(
        String tenantId,
        String tenantCode,
        String tenantName,
        java.math.BigDecimal totalPaid,
        List<Billing.Transaction> transactions,
        List<Billing.PaymentMethod> paymentMethods,
        String utilityStatementPeriod,
        List<Billing.UtilityBreakdown> utilityBreakdowns,
        List<Billing.BreakdownLine> breakdown,
        Billing billing,
        java.math.BigDecimal electricityRate
) {
}
