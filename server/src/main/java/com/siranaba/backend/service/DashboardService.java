package com.siranaba.backend.service;

import com.siranaba.backend.dto.DashboardSummaryResponse;
import com.siranaba.backend.dto.UpdateTenantProfileRequest;
import com.siranaba.backend.model.Tenant;
import com.siranaba.backend.repository.TicketRepository;
import org.springframework.stereotype.Service;

@Service
public class DashboardService {

    private final TenantContext tenantContext;
    private final TicketRepository ticketRepository;
    private final TenantProfileService tenantProfileService;
    private final MonthlyMaintenanceService monthlyMaintenanceService;
    private final BillingLedgerService ledger;

    public DashboardService(TenantContext tenantContext, TicketRepository ticketRepository,
                             TenantProfileService tenantProfileService, MonthlyMaintenanceService monthlyMaintenanceService, BillingLedgerService ledger) {
        this.ledger = ledger;
        this.tenantContext = tenantContext;
        this.ticketRepository = ticketRepository;
        this.tenantProfileService = tenantProfileService;
        this.monthlyMaintenanceService = monthlyMaintenanceService;
    }

    public Tenant getTenant() {
        return ledger.project(tenantContext.currentTenant());
    }

    public DashboardSummaryResponse getSummary() {
        Tenant tenant = getTenant();
        long activeTicketCount = ticketRepository.countByTenantIdAndStageNotIn(tenant.getId(), java.util.List.of("Resolved", "Cancelled"));

        return new DashboardSummaryResponse(
                tenant,
                tenant.getUtilityUsage(),
                tenant.getManagementTools(),
                tenant.getRecentActivity(),
                activeTicketCount,
                new com.siranaba.backend.model.ScheduledMaintenance("Monthly Maintenance", monthlyMaintenanceService.get().nextDate())
        );
    }

    /**
     * Account Settings -> Profile. Goes through TenantProfileService, the same
     * code path the admin portal uses to edit a tenant, so both sides stay in step.
     */
    public Tenant updateProfile(UpdateTenantProfileRequest request) {
        return ledger.project(tenantProfileService.update(tenantContext.currentTenant(), request));
    }
}
