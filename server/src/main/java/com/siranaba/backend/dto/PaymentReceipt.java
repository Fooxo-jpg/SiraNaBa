package com.siranaba.backend.dto;
import com.siranaba.backend.model.Billing;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
public record PaymentReceipt(String referenceCode, Instant paidAt, String paymentMode, BigDecimal amount,
    String status, String paymentType, BigDecimal rentAllocation, BigDecimal utilityAllocation,
    boolean simulated, List<Billing.Allocation> allocations) {
    public static PaymentReceipt from(Billing.Transaction t) { return new PaymentReceipt(t.getId(), t.getPaidAt(),
        t.getPaymentMode(), t.getAmount(), t.getStatus(), t.getPaymentType(), t.getRentAllocation(), t.getUtilityAllocation(), t.isSimulated(), t.getAllocations()); }
}
