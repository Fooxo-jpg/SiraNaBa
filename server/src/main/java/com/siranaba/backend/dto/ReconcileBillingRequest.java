package com.siranaba.backend.dto;

import java.math.BigDecimal;
import java.util.List;

/** Explicit, audited opening obligations; never infer allocations from ambiguous legacy records. */
public record ReconcileBillingRequest(Long expectedVersion, String reason,
        List<OpeningRent> rents, List<OpeningUtility> utilities) {
    public record OpeningRent(String billingPeriod, String dueDate, BigDecimal amount, BigDecimal paid) {}
    public record OpeningUtility(String billingPeriod, String dueDate, BigDecimal waterCharge,
            BigDecimal electricityCharge, BigDecimal parkingCharge, BigDecimal paid) {}
}
