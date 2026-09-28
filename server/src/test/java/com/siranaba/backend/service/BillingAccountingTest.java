package com.siranaba.backend.service;

import com.siranaba.backend.dto.*;
import com.siranaba.backend.exception.ApiException;
import com.siranaba.backend.model.Billing;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

class BillingAccountingTest {
    static BigDecimal n(String s) { return new BigDecimal(s); }
    static void eq(String expected, BigDecimal actual) { assertEquals(0, n(expected).compareTo(actual), expected + " != " + actual); }
    static Billing ledger(String rent, String utility) {
        Billing b = Billing.empty("tenant-1"); b.setSchemaVersion(2); b.setVersion(0L);
        b.getRentObligations().add(BillingAccounting.rent("2099-09", "2099-09-30", n(rent), n("0")));
        if (n(utility).signum() > 0) BillingAccounting.present(b, bill("2099-09", "1", utility, "0", false, false, null), n("12"));
        return b;
    }
    static PresentBillRequest bill(String period, String water, String rate, String electricity, boolean parking, boolean reissue, Integer revision) {
        return new PresentBillRequest(n(water), n(rate), n(electricity), n("999"), parking, period, "2099-09-30", reissue, revision);
    }
    static PayRequest request(String amount, String type, String key, String statement) {
        return new PayRequest(null, "EWALLET", "GCash", n(amount), type, key, statement);
    }
    static Billing.Transaction pay(Billing b, String amount, String type) {
        return BillingAccounting.pay(b, request(amount, type, UUID.randomUUID().toString(), null), "GCash", true);
    }
    @Test void utilityBillingMustNotModifyRent() {
        Billing b = ledger("5000", "0");
        BillingAccounting.present(b, bill("2099-09", "5", "60", "100", true, false, null), n("12"));
        eq("5000", b.getRentBalance()); eq("2500", b.getUtilityBalance());
        var s = b.getUtilityStatements().get(0);
        eq("300", s.getWaterCharge()); eq("1200", s.getElectricityCharge()); eq("1000", s.getParkingCharge());
        eq("12", s.getElectricityRate()); // Ignores the client-supplied 999 rate.
    }
    @Test void partialRentPaymentLeavesUtilitiesUnchanged() {
        Billing b = ledger("5000", "2500"); var tx = pay(b, "2000", "RENT");
        eq("3000", b.getRentBalance()); eq("2500", b.getUtilityBalance()); eq("2000", tx.getRentAllocation()); eq("0", tx.getUtilityAllocation());
        assertEquals("PARTIALLY_PAID", b.getRentStatus());
    }
    @Test void partialUtilityPaymentLeavesRentUnchanged() {
        Billing b = ledger("3000", "2500"); var tx = pay(b, "1500", "UTILITY");
        eq("3000", b.getRentBalance()); eq("1000", b.getUtilityBalance()); eq("0", tx.getRentAllocation()); eq("1500", tx.getUtilityAllocation());
        assertEquals("PARTIALLY_PAID", b.getUtilityStatements().get(0).getStatus());
    }
    @Test void combinedPaymentAllocatesRentThenUtilities() {
        Billing b = ledger("3000", "2000"); var tx = pay(b, "4000", "BOTH");
        eq("0", b.getRentBalance()); eq("1000", b.getUtilityBalance()); eq("3000", tx.getRentAllocation()); eq("1000", tx.getUtilityAllocation());
        assertEquals("COMBINED", tx.getPaymentType()); assertEquals(2, tx.getAllocations().size());
        eq("4000", tx.getAllocations().stream().map(Billing.Allocation::amount).reduce(BigDecimal.ZERO, BigDecimal::add));
    }
    @Test void fullPaymentClearsBothAndSetsPaidStatuses() {
        Billing b = ledger("3000", "1000"); pay(b, "4000", "COMBINED");
        eq("0", b.getRentBalance()); eq("0", b.getUtilityBalance()); eq("0", b.getTotalOutstanding());
        assertEquals("PAID", b.getRentStatus()); assertEquals("PAID", b.getUtilityStatements().get(0).getStatus());
    }
    @Test void newPeriodPreservesPriorStatementRentAndQueuesAccurateNotification() {
        Billing b = ledger("5000", "500"); String originalId = b.getUtilityStatements().get(0).getId();
        BillingAccounting.present(b, bill("2099-10", "5", "60", "100", true, false, null), n("12"));
        assertEquals(2, b.getUtilityStatements().size()); assertEquals(originalId, b.getUtilityStatements().get(0).getId());
        eq("5000", b.getRentBalance()); eq("3000", b.getUtilityBalance());
        var note = b.getNotificationOutbox().get(1);
        assertTrue(note.getBody().contains("2099-10")); assertTrue(note.getBody().contains("2,500.00"));
        assertTrue(note.getBody().contains("rent balance is unchanged"));
    }
    @Test void duplicateRequestReturnsOriginalReceiptWithoutSecondDeductionOrNotification() {
        Billing b = ledger("5000", "2500"); var req = request("2000", "RENT", "same-request-123", null);
        var first = BillingAccounting.pay(b, req, "GCash", true);
        var second = BillingAccounting.pay(b, req, "GCash", true);
        assertSame(first, second); eq("3000", b.getRentBalance()); assertEquals(1, b.getTransactions().size()); assertEquals(2, b.getNotificationOutbox().size());
    }
    @Test void retryUsingTheReturnedTransactionReferenceCannotDeductTwice() {
        Billing b = ledger("5000", "0");
        var first = BillingAccounting.pay(b, request("2000", "RENT", "first-reference-key", null), "GCash", true);
        var retry = BillingAccounting.pay(b, request("2000", "RENT", first.getId(), null), "GCash", true);
        assertSame(first, retry); eq("3000", b.getRentBalance()); assertEquals(1, b.getTransactions().size());
    }
    @Test void rejectsReusingKeyWithDifferentAmount() {
        Billing b = ledger("5000", "0"); BillingAccounting.pay(b, request("2000", "RENT", "same-key-123", null), "GCash", true);
        assertThrows(ApiException.class, () -> BillingAccounting.pay(b, request("1000", "RENT", "same-key-123", null), "GCash", true));
        eq("3000", b.getRentBalance()); assertEquals(1, b.getTransactions().size());
    }
    @Test void invalidAmountsTypesAndOverpaymentsLeaveEverythingUntouched() {
        Billing b = ledger("3000", "1000");
        for (String amount : new String[]{"0", "-1", "0.001", "4001", "1000000001"}) assertThrows(ApiException.class, () -> pay(b, amount, "COMBINED"));
        assertThrows(ApiException.class, () -> pay(b, "1001", "UTILITY"));
        assertThrows(ApiException.class, () -> pay(b, "3001", "RENT"));
        assertThrows(ApiException.class, () -> pay(b, "1", "INVALID"));
        eq("3000", b.getRentBalance()); eq("1000", b.getUtilityBalance()); assertTrue(b.getTransactions().isEmpty());
    }
    @Test void utilitiesRequireAnUnpaidStatementOwnedByThisTenant() {
        Billing empty = ledger("3000", "0"); assertThrows(ApiException.class, () -> pay(empty, "1", "UTILITY"));
        Billing b = ledger("3000", "1000");
        assertThrows(ApiException.class, () -> BillingAccounting.pay(b, request("1", "UTILITY", "request-unknown", "other-tenant-statement"), "GCash", true));
        pay(b, "1000", "UTILITY"); assertThrows(ApiException.class, () -> pay(b, "1", "UTILITY")); eq("3000", b.getRentBalance());
    }
    @Test void targetedUtilityPaymentDoesNotTouchAnotherPeriod() {
        Billing b = ledger("3000", "1000");
        BillingAccounting.present(b, bill("2099-10", "1", "500", "0", false, false, null), n("12"));
        var target = b.getUtilityStatements().get(1);
        var tx = BillingAccounting.pay(b, request("300", "UTILITY", "targeted-123", target.getId()), "GCash", true);
        eq("1000", b.getUtilityStatements().get(0).getBalance()); eq("200", target.getBalance()); assertEquals(target.getId(), tx.getRelatedUtilityStatementId());
    }
    @Test void combinedPaymentUsesOverdueRentBeforeCurrentRent() {
        Billing b = ledger("3000", "1000"); var overdue = BillingAccounting.rent("2020-01", "2020-01-31", n("1000"), n("0")); b.getRentObligations().add(overdue);
        var tx = pay(b, "1500", "COMBINED");
        assertEquals(overdue.getId(), tx.getAllocations().get(0).obligationId()); eq("0", overdue.getBalance()); eq("2500", b.getRentBalance()); eq("1000", b.getUtilityBalance());
    }
    @Test void duplicateUtilityPeriodRequiresExplicitVersionedReissueAndPreservesRevision() {
        Billing b = ledger("5000", "1000");
        assertTrue(BillingAccounting.present(b, bill("2099-09", "1", "1000", "0", false, false, null), n("12")).unchanged());
        assertThrows(ApiException.class, () -> BillingAccounting.present(b, bill("2099-09", "1", "1200", "0", false, false, null), n("12")));
        assertThrows(ApiException.class, () -> BillingAccounting.present(b, bill("2099-09", "1", "1200", "0", false, true, 4), n("12")));
        BillingAccounting.present(b, bill("2099-09", "1", "1200", "0", false, true, 1), n("12"));
        assertEquals(1, b.getUtilityStatements().size()); var s = b.getUtilityStatements().get(0);
        assertEquals(2, s.getRevision()); eq("1000", s.getRevisions().get(0).amount()); eq("5000", b.getRentBalance());
    }
    @Test void reissueCannotEraseAllocatedPayments() {
        Billing b = ledger("5000", "1000"); pay(b, "600", "UTILITY");
        assertThrows(ApiException.class, () -> BillingAccounting.present(b, bill("2099-09", "1", "500", "0", false, true, 1), n("12")));
        eq("400", b.getUtilityBalance()); assertEquals(1, b.getUtilityStatements().get(0).getRevision());
    }
    @Test void unreconciledLegacyBalancesCannotBeChargedOrPaid() {
        Billing b = ledger("5000", "0"); b.setReconciliationRequired(true);
        assertNull(b.getTotalOutstanding()); assertEquals("REVIEW_REQUIRED", b.getRentStatus());
        assertThrows(ApiException.class, () -> pay(b, "1000", "RENT"));
        assertThrows(ApiException.class, () -> BillingAccounting.present(b, bill("2099-09", "1", "1000", "0", false, false, null), n("12")));
    }
    @Test void decimalChargesRoundIndividuallyToCentavos() {
        Billing b = ledger("0", "0"); BillingAccounting.present(b, bill("2099-09", "1.005", "1", "1.005", false, false, null), n("1"));
        eq("2.02", b.getUtilityBalance());
    }
    @Test void gcashIsNotForcedToFailAndSimulationIsExplicit() {
        Billing b = ledger("5000", "0"); var tx = pay(b, "1000", "RENT");
        assertEquals("PAID", tx.getStatus()); assertTrue(tx.isSimulated()); assertTrue(tx.getTitle().contains("simulated"));
        assertTrue(b.getNotificationOutbox().get(0).getBody().contains("no real funds were transferred"));
        assertNotNull(tx.getCreatedAt()); assertNotNull(tx.getPaidAt()); assertEquals("tenant-1", tx.getTenantId());
    }
}
