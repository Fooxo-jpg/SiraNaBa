package com.siranaba.backend.dto;

import java.time.Instant;

/** One payment as the admin sees it: the transaction plus who paid it. */
public record AdminPaymentResponse(
        String referenceCode,
        String tenantId,
        /** Registry ID, e.g. "T-0007". */
        String tenantCode,
        String tenantName,
        String unit,
        String building,
        String title,
        double amount,
        String paymentMode,
        /** Exact payment time (null for very old records that only have a date). */
        Instant paidAt,
        /** yyyy-MM-dd */
        String date,
        String status
) {
}
