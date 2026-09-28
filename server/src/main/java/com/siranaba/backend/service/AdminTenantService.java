package com.siranaba.backend.service;

import com.siranaba.backend.dto.*;
import com.siranaba.backend.exception.*;
import com.siranaba.backend.model.*;
import com.siranaba.backend.repository.TenantRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;

@Service
public class AdminTenantService {
    // Existing configured reference rate, not a live utility-provider integration.
    public static final BigDecimal ELECTRICITY_RATE = new BigDecimal("14.7424");
    private final TenantRepository tenants;
    private final BillingLedgerService ledger;
    private final TenantProfileService profiles;
    private final TenantCodeService codes;
    public AdminTenantService(TenantRepository tenants, BillingLedgerService ledger, TenantProfileService profiles, TenantCodeService codes) {
        this.tenants = tenants; this.ledger = ledger; this.profiles = profiles; this.codes = codes;
    }
    public List<AdminTenantResponse> list() {
        codes.assignMissingCodes();
        return tenants.findAll().stream().sorted(Comparator.comparingInt(t -> TenantCodeService.number(t.getTenantCode())))
                .map(this::toResponse).toList();
    }
    public AdminTenantResponse updateProfile(String tenantId, UpdateTenantProfileRequest req) {
        return toResponse(profiles.update(find(tenantId), req));
    }
    public PaymentReceipt markPaid(String tenantId, PayRequest req) {
        if (!"MANUAL".equals(req.type()) || req.provider() == null || !Set.of("Cash", "GCash", "Maya", "Bank Transfer", "Card", "Other").contains(req.provider()))
            throw new ApiException(HttpStatus.BAD_REQUEST, "Select the actual method used for the received payment.");
        return ledger.mutate(tenantId, b -> {
            var transaction = BillingAccounting.pay(b, req, req.provider() + " (recorded by management)", false);
            if (transaction.getRecordedBy() == null) transaction.setRecordedBy(SecurityContextHolder.getContext().getAuthentication().getName());
            return PaymentReceipt.from(transaction);
        });
    }
    public PresentBillResponse presentBill(String tenantId, PresentBillRequest req) {
        return ledger.mutate(tenantId, b -> BillingAccounting.present(b, req, ELECTRICITY_RATE));
    }
    public record IssueRentRequest(String billingPeriod, String dueDate) {}
    public Billing issueRent(String tenantId, IssueRentRequest req) {
        Tenant t = find(tenantId);
        return ledger.mutate(tenantId, b -> {
            BillingAccounting.ready(b);
            String period = BillingAccounting.period(req.billingPeriod());
            String due = BillingAccounting.date(req.dueDate());
            if (b.getRentObligations().stream().anyMatch(r -> period.equals(r.getBillingPeriod())))
                throw new ApiException(HttpStatus.CONFLICT, "Rent has already been issued for this period.");
            var rent = BillingAccounting.rent(period, due, BigDecimal.valueOf(t.getMonthlyRent()), BigDecimal.ZERO);
            b.getRentObligations().add(rent);
            BillingAccounting.queueNotification(b, rent.getId(), "Rent charge issued",
                "Your " + period + " rent charge of PHP " + rent.getAmount().toPlainString() + " is due " + due + ". Utilities are separate.");
            return b;
        });
    }
    public Billing reconcile(String tenantId, ReconcileBillingRequest req) {
        return ledger.mutate(tenantId, b -> {
            if (!b.isReconciliationRequired() || !Objects.equals(req.expectedVersion(), b.getVersion()))
                throw new ApiException(HttpStatus.CONFLICT, "Billing changed or was already reconciled. Refresh and review it again.");
            if (req.reason() == null || req.reason().trim().length() < 10 || req.reason().length() > 2000)
                throw new ApiException(HttpStatus.BAD_REQUEST, "Provide an audit note explaining the verified opening balances (10–2000 characters).");
            if (req.rents() == null || req.utilities() == null)
                throw new ApiException(HttpStatus.BAD_REQUEST, "Explicit rent and utility opening lists are required (empty lists mean no obligations).");
            if (!b.getRentObligations().isEmpty() || !b.getUtilityStatements().isEmpty())
                throw new ApiException(HttpStatus.CONFLICT, "Existing Model B obligations require manual investigation, not replacement.");
            Set<String> periods = new HashSet<>();
            for (var r : req.rents()) {
                var rent = BillingAccounting.rent(r.billingPeriod(), r.dueDate(), r.amount(), r.paid());
                if (!periods.add(rent.getBillingPeriod())) throw new ApiException(HttpStatus.BAD_REQUEST, "Duplicate rent period.");
                b.getRentObligations().add(rent);
            }
            periods.clear();
            for (var u : req.utilities()) {
                var statement = new Billing.UtilityStatement();
                statement.setOpeningBalance(true);
                statement.setId("UTIL-" + UUID.randomUUID()); statement.setBillingPeriod(BillingAccounting.period(u.billingPeriod()));
                if (!periods.add(statement.getBillingPeriod())) throw new ApiException(HttpStatus.BAD_REQUEST, "Duplicate utility period.");
                statement.setDueDate(BillingAccounting.date(u.dueDate()));
                statement.setStatementDate(LocalDate.now(BillingAccounting.MANILA).toString()); statement.setCreatedAt(Instant.now());
                statement.setWaterCharge(BillingAccounting.money(u.waterCharge()));
                statement.setElectricityCharge(BillingAccounting.money(u.electricityCharge()));
                statement.setParkingCharge(BillingAccounting.money(u.parkingCharge()));
                statement.setAmount(BillingAccounting.money(statement.getWaterCharge().add(statement.getElectricityCharge()).add(statement.getParkingCharge())));
                statement.setPaid(BillingAccounting.money(u.paid()));
                if (statement.getPaid().compareTo(statement.getAmount()) > 0) throw new ApiException(HttpStatus.BAD_REQUEST, "Utility paid cannot exceed its charge.");
                b.getUtilityStatements().add(statement);
            }
            b.setReconciliationRequired(false); b.setReconciliationNote(req.reason().trim()); b.setReconciledAt(Instant.now());
            b.setReconciledBy(SecurityContextHolder.getContext().getAuthentication().getName());
            BillingAccounting.queueNotification(b, "reconciliation-" + b.getId(), "Opening billing balances verified",
                "Management verified your opening rent balance of PHP " + b.getRentBalance().toPlainString()
                + " and utility balance of PHP " + b.getUtilityBalance().toPlainString() + ". Prior payment history is retained.");
            return b;
        });
    }
    private Tenant find(String id) { return tenants.findById(id).orElseThrow(() -> new ResourceNotFoundException("Tenant not found.")); }
    private AdminTenantResponse toResponse(Tenant t) {
        Billing b = ledger.get(t.getId());
        String payment = b.isReconciliationRequired() ? "Review Required" : b.getTotalOutstanding().signum() == 0 ? "Paid"
            : "OVERDUE".equals(b.getRentStatus()) || b.getUtilityStatements().stream().anyMatch(u -> "OVERDUE".equals(u.getStatus())) ? "Overdue" : "Pending";
        String first = Objects.toString(t.getFirstName(), ""), last = Objects.toString(t.getLastName(), "");
        String occupancy = t.getLeaseStart() != null && LocalDate.parse(t.getLeaseStart()).isAfter(LocalDate.now(BillingAccounting.MANILA)) ? "Scheduled" : "Active";
        return new AdminTenantResponse(t.getId(), t.getTenantCode(), first, last, (first + " " + last).trim(), t.getEmail(), t.getPhone(),
            t.getRoomId(), t.getTower(), t.getBuilding(), t.getUnit(), t.getUnitType(), t.getLeaseStart(), t.getMonthlyRent(), b.getRentDueDate(),
            b.getRentBalance(), b.getUtilityBalance(), b.getTotalOutstanding(), b.getRentPaid(), b.getRentStatus(), b.isReconciliationRequired(),
            occupancy, payment, b.isReconciliationRequired() ? "Review Required" : "Overdue".equals(payment) ? "Delinquent" : "Good Standing");
    }
}
