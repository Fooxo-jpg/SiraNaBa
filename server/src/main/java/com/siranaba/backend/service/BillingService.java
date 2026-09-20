package com.siranaba.backend.service;

import com.siranaba.backend.model.Billing;
import com.siranaba.backend.repository.BillingRepository;
import org.springframework.stereotype.Service;

@Service
public class BillingService {

    private final BillingRepository billingRepository;
    private final TenantContext tenantContext;

    public BillingService(BillingRepository billingRepository, TenantContext tenantContext) {
        this.billingRepository = billingRepository;
        this.tenantContext = tenantContext;
    }

    public Billing getBilling() {
        String tenantId = tenantContext.currentTenantId();
        // No record yet (or it was cleared) means an empty billing page, not an error.
        return billingRepository.findByTenantId(tenantId)
                .orElseGet(() -> Billing.empty(tenantId));
    }
}
