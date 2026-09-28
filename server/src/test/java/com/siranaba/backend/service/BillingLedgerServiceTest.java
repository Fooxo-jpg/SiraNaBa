package com.siranaba.backend.service;

import com.siranaba.backend.dto.PayRequest;
import com.siranaba.backend.exception.*;
import com.siranaba.backend.model.*;
import com.siranaba.backend.repository.*;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static com.siranaba.backend.service.BillingAccountingTest.*;

class BillingLedgerServiceTest {
    final BillingRepository repository = mock(BillingRepository.class);
    final TenantRepository tenants = mock(TenantRepository.class);
    final MongoTemplate mongo = mock(MongoTemplate.class);
    final BillingLedgerService service = new BillingLedgerService(repository, tenants, mongo);
    Tenant tenant() { Tenant t = new Tenant(); t.setId("tenant-1"); when(tenants.findById("tenant-1")).thenReturn(Optional.of(t)); return t; }
    @Test void missingTenantIsRejectedBeforeMutation() {
        when(tenants.findById("missing")).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> service.mutate("missing", b -> pay(b, "1", "RENT")));
        verifyNoInteractions(repository);
    }
    @Test void savesBalancesHistoryAndNotificationInExactlyOneDocumentWrite() {
        tenant(); Billing b = ledger("5000", "2500"); when(repository.findByTenantId("tenant-1")).thenReturn(Optional.of(b));
        service.mutate("tenant-1", x -> pay(x, "2000", "RENT"));
        var captured = ArgumentCaptor.forClass(Billing.class); verify(repository).save(captured.capture());
        eq("3000", captured.getValue().getRentBalance()); eq("2500", captured.getValue().getUtilityBalance());
        assertEquals(1, captured.getValue().getTransactions().size()); assertEquals(2, captured.getValue().getNotificationOutbox().size());
        verify(tenants, never()).save(any()); verifyNoInteractions(mongo);
    }
    @Test void concurrentSameKeyPaymentReloadsAndReturnsCommittedTransaction() {
        tenant(); Billing original = ledger("5000", "0"), committed = ledger("5000", "0");
        PayRequest req = request("2000", "RENT", "concurrent-key-123", null);
        var transaction = BillingAccounting.pay(committed, req, "GCash", true);
        when(repository.findByTenantId("tenant-1")).thenReturn(Optional.of(original), Optional.of(committed));
        when(repository.save(any())).thenThrow(new OptimisticLockingFailureException("concurrent update")).thenReturn(committed);
        var result = service.mutate("tenant-1", b -> BillingAccounting.pay(b, req, "GCash", true));
        assertEquals(transaction.getId(), result.getId()); eq("3000", committed.getRentBalance()); assertEquals(1, committed.getTransactions().size());
        verify(repository, times(2)).save(any());
    }
    @Test void storageFailureDoesNotReturnSuccessfulReceiptOrUpdateTenantSeparately() {
        tenant(); when(repository.findByTenantId("tenant-1")).thenAnswer(i -> Optional.of(ledger("5000", "0")));
        when(repository.save(any())).thenThrow(new org.springframework.dao.DataAccessResourceFailureException("offline"));
        assertThrows(org.springframework.dao.DataAccessResourceFailureException.class, () -> service.mutate("tenant-1", b -> pay(b, "2000", "RENT")));
        eq("5000", service.get("tenant-1").getRentBalance()); verify(tenants, never()).save(any());
    }
    @Test void migrationKeepsLegacyEvidenceAndFlagsBalancesRatherThanGuessing() {
        Tenant t = tenant(); t.setLegacyCurrentBalance(2850.0);
        Billing old = Billing.empty("tenant-1"); old.setId("old-id"); old.getBreakdown().add(new Billing.BreakdownLine("Water", 350));
        Billing migrated = Billing.empty("tenant-1"); migrated.setSchemaVersion(2); migrated.setReconciliationRequired(true); migrated.setVersion(0L);
        when(repository.findByTenantId("tenant-1")).thenReturn(Optional.of(old), Optional.of(migrated));
        assertTrue(service.get("tenant-1").isReconciliationRequired());
        var update = ArgumentCaptor.forClass(Update.class); verify(mongo).updateFirst(any(Query.class), update.capture(), eq(Billing.class));
        var fields = update.getValue().getUpdateObject().get("$set", org.bson.Document.class);
        assertEquals(true, fields.get("reconciliationRequired")); assertFalse(fields.containsKey("breakdown")); assertFalse(fields.containsKey("transactions"));
        assertFalse(fields.containsKey("rentObligations")); verify(repository, never()).save(any());
    }
    @Test void retryStillWorksAfterTheSavedMethodWasRemoved() {
        Tenant t = tenant(); var context = mock(TenantContext.class); when(context.currentTenant()).thenReturn(t);
        Billing b = ledger("5000", "0");
        b.getPaymentMethods().add(new Billing.PaymentMethod("PM-1", "EWALLET", "GCash", "Demo", "1234", null, true));
        when(repository.findByTenantId("tenant-1")).thenReturn(Optional.of(b));
        var billingService = new BillingService(service, context);
        var req = new PayRequest("PM-1", null, null, n("2000"), "RENT", "saved-method-retry", null);
        var first = billingService.pay(req); b.getPaymentMethods().clear();
        assertEquals(first.referenceCode(), billingService.pay(req).referenceCode()); eq("3000", b.getRentBalance());
        assertThrows(ApiException.class, () -> billingService.pay(new PayRequest("PM-2", null, null, n("2000"), "RENT", "saved-method-retry", null)));
    }
    @Test void gcashServiceCheckoutRecordsSuccessWithExactAllocationAndSimulationFlag() {
        Tenant t = tenant(); var context = mock(TenantContext.class); when(context.currentTenant()).thenReturn(t);
        Billing b = ledger("5000", "0"); when(repository.findByTenantId("tenant-1")).thenReturn(Optional.of(b));
        var billingService = new BillingService(service, context);
        var receipt = billingService.pay(request("2000", "RENT", "gcash-request-123", null));
        assertEquals("PAID", receipt.status()); assertTrue(receipt.simulated()); eq("2000", receipt.rentAllocation()); eq("0", receipt.utilityAllocation());
    }
}
