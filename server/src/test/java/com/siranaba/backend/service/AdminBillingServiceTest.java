package com.siranaba.backend.service;

import com.siranaba.backend.dto.ReconcileBillingRequest;
import com.siranaba.backend.exception.ApiException;
import com.siranaba.backend.model.*;
import com.siranaba.backend.repository.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static com.siranaba.backend.service.BillingAccountingTest.*;

class AdminBillingServiceTest {
    final TenantRepository tenants = mock(TenantRepository.class);
    final BillingRepository repository = mock(BillingRepository.class);
    final BillingLedgerService ledgerService = new BillingLedgerService(repository, tenants, mock(MongoTemplate.class));
    final AdminTenantService service = new AdminTenantService(tenants, ledgerService, mock(TenantProfileService.class), mock(TenantCodeService.class));
    void setup(Billing b) {
        Tenant t = new Tenant(); t.setId("tenant-1"); t.setMonthlyRent(5000);
        when(tenants.findById("tenant-1")).thenReturn(Optional.of(t));
        when(repository.findByTenantId("tenant-1")).thenReturn(Optional.of(b));
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("admin-1", null, List.of()));
    }
    @AfterEach void clearAuth() { SecurityContextHolder.clearContext(); }
    @Test void explicitReconciliationPreservesLegacyHistoryAndAuditsVerifiedOpeningBalances() {
        Billing b = Billing.empty("tenant-1"); b.setSchemaVersion(2); b.setVersion(0L); b.setReconciliationRequired(true); b.setLegacyOutstandingAmount(n("2850"));
        var old = new Billing.Transaction(); old.setId("OLD"); old.setAmount(n("2000")); old.setStatus("Successful"); b.getTransactions().add(old); setup(b);
        var req = new ReconcileBillingRequest(0L, "Verified against original rental receipts and utility invoices",
            List.of(new ReconcileBillingRequest.OpeningRent("2099-09", "2099-09-30", n("5000"), n("2000"))),
            List.of(new ReconcileBillingRequest.OpeningUtility("2099-09", "2099-09-30", n("300"), n("1200"), n("1000"), n("1500"))));
        service.reconcile("tenant-1", req);
        eq("3000", b.getRentBalance()); eq("1000", b.getUtilityBalance()); eq("2850", b.getLegacyOutstandingAmount());
        assertSame(old, b.getTransactions().get(0)); assertEquals(1, b.getTransactions().size()); assertNull(old.getRentAllocation());
        assertEquals("admin-1", b.getReconciledBy()); assertNotNull(b.getReconciledAt()); assertTrue(b.getUtilityStatements().get(0).isOpeningBalance());
        assertThrows(ApiException.class, () -> service.reconcile("tenant-1", req));
    }
    @Test void rentIssuanceUsesStoredRentAndNeverTouchesUtilitiesOrDuplicatesPeriod() {
        Billing b = ledger("3000", "2500"); setup(b);
        service.issueRent("tenant-1", new AdminTenantService.IssueRentRequest("2099-10", "2099-10-30"));
        eq("8000", b.getRentBalance()); eq("2500", b.getUtilityBalance());
        assertThrows(ApiException.class, () -> service.issueRent("tenant-1", new AdminTenantService.IssueRentRequest("2099-10", "2099-10-30")));
    }
    @Test void receivedPaymentRecordsRealMethodActorAndCorrectAllocation() {
        Billing b = ledger("5000", "2500"); setup(b);
        var req = new com.siranaba.backend.dto.PayRequest(null, "MANUAL", "Cash", n("2000"), "RENT", "cash-receipt-key", null);
        var receipt = service.markPaid("tenant-1", req);
        assertFalse(receipt.simulated()); assertEquals("Cash (recorded by management)", receipt.paymentMode());
        eq("3000", b.getRentBalance()); eq("2500", b.getUtilityBalance()); assertEquals("admin-1", b.getTransactions().get(0).getRecordedBy());
        assertEquals(receipt.referenceCode(), service.markPaid("tenant-1", req).referenceCode());
    }
    @Test void removingATenantArchivesRatherThanDeletesTheLedger() {
        Billing b = ledger("5000", "2500"); setup(b);
        var users = mock(UserRepository.class); var notes = mock(NotificationRepository.class);
        var registration = new TenantRegistrationService(tenants, users, repository, notes,
            mock(org.springframework.security.crypto.password.PasswordEncoder.class), mock(EmailService.class), mock(TenantCodeService.class), mock(AuditLogService.class), ledgerService);
        registration.remove("tenant-1");
        assertTrue(b.isArchived()); assertNotNull(b.getTenantSnapshot()); verify(repository, never()).deleteByTenantId(anyString());
        verify(users).deleteByTenantId("tenant-1"); verify(tenants).deleteById("tenant-1");
    }
    @Test void archivedTenantPaymentHistoryRemainsRetrievableByAdministrator() {
        Billing b = ledger("5000", "0"); pay(b, "2000", "RENT"); b.setArchived(true);
        b.setTenantSnapshot(new Billing.TenantSnapshot("T-0001", "Test", "Tenant", "101", "Tower 1"));
        when(tenants.findById("tenant-1")).thenReturn(Optional.empty()); when(tenants.findAll()).thenReturn(List.of());
        when(repository.findByTenantId("tenant-1")).thenReturn(Optional.of(b)); when(repository.findAll()).thenReturn(List.of(b));
        var payments = new AdminPaymentService(repository, tenants, ledgerService);
        assertEquals(1, payments.forTenant("tenant-1").transactions().size()); assertEquals("Test Tenant", payments.recent(10).get(0).tenantName());
        assertThrows(ApiException.class, () -> pay(b, "1000", "RENT"));
    }
}
