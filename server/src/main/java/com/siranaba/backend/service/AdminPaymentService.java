package com.siranaba.backend.service;

import com.siranaba.backend.dto.AdminPaymentResponse;
import com.siranaba.backend.dto.TenantPaymentsResponse;
import com.siranaba.backend.exception.ResourceNotFoundException;
import com.siranaba.backend.model.Billing;
import com.siranaba.backend.model.Tenant;
import com.siranaba.backend.repository.BillingRepository;
import com.siranaba.backend.repository.TenantRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Admin view of payments. Reads the very same billing documents the tenant's
 * Billing page writes to, so a payment made in the tenant portal (reference code,
 * payment mode, time) is visible here as soon as it is saved.
 */
@Service
public class AdminPaymentService {

    private final BillingRepository billingRepository;
    private final TenantRepository tenantRepository;

    public AdminPaymentService(BillingRepository billingRepository, TenantRepository tenantRepository) {
        this.billingRepository = billingRepository;
        this.tenantRepository = tenantRepository;
    }

    /** Latest payments across all tenants, newest first. */
    public List<AdminPaymentResponse> recent(int limit) {
        Map<String, Tenant> tenants = new HashMap<>();
        tenantRepository.findAll().forEach(t -> tenants.put(t.getId(), t));

        return billingRepository.findAll().stream()
                .filter(b -> tenants.containsKey(b.getTenantId())) // skip records of removed tenants
                .flatMap(b -> b.getTransactions().stream().map(tx -> toResponse(tenants.get(b.getTenantId()), tx)))
                .sorted(Comparator.comparing(AdminPaymentResponse::paidAt, Comparator.nullsLast(Comparator.<Instant>reverseOrder()))
                        .thenComparing(AdminPaymentResponse::date, Comparator.nullsLast(Comparator.<String>reverseOrder())))
                .limit(Math.max(1, Math.min(limit, 200)))
                .toList();
    }

    public TenantPaymentsResponse forTenant(String tenantId) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant not found."));
        Billing billing = billingRepository.findByTenantId(tenantId).orElseGet(() -> Billing.empty(tenantId));
        double totalPaid = billing.getTransactions().stream()
                .filter(t -> "Successful".equals(t.getStatus()))
                .mapToDouble(Billing.Transaction::getAmount)
                .sum();
        String name = ((tenant.getFirstName() == null ? "" : tenant.getFirstName()) + " "
                + (tenant.getLastName() == null ? "" : tenant.getLastName())).trim();
        return new TenantPaymentsResponse(tenant.getId(), tenant.getTenantCode(), name, totalPaid,
                billing.getTransactions(), billing.getPaymentMethods(), billing.getUtilityStatementPeriod(),
                billing.getUtilityBreakdowns(), billing.getBreakdown());
    }

    private static AdminPaymentResponse toResponse(Tenant t, Billing.Transaction tx) {
        String name = ((t.getFirstName() == null ? "" : t.getFirstName()) + " "
                + (t.getLastName() == null ? "" : t.getLastName())).trim();
        Instant paidAt = tx.getPaidAt();
        return new AdminPaymentResponse(tx.getId(), t.getId(), t.getTenantCode(), name, t.getUnit(), t.getBuilding(),
                tx.getTitle(), tx.getAmount(), tx.getPaymentMode(), paidAt, tx.getDate(), tx.getStatus());
    }
}
