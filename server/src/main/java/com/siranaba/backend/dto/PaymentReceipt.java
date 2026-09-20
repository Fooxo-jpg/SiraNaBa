package com.siranaba.backend.dto;

import java.time.Instant;

public record PaymentReceipt(
        String referenceCode,
        Instant paidAt,
        String paymentMode,
        double amount,
        String status
) {
}
