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

    public DashboardService(TenantContext tenantContext, TicketRepository ticketRepository,
                             TenantProfileService tenantProfileService) {
        this.tenantContext = tenantContext;
        this.ticketRepository = ticketRepository;
        this.tenantProfileService = tenantProfileService;
    }

    public Tenant getTenant() {
        return tenantContext.currentTenant();
    }

    public DashboardSummaryResponse getSummary() {
        Tenant tenant = tenantContext.currentTenant();
        long activeTicketCount = ticketRepository.countByTenantIdAndStageNot(tenant.getId(), "Resolved");

        return new DashboardSummaryResponse(
                tenant,
                tenant.getUtilityUsage(),
                tenant.getManagementTools(),
                tenant.getRecentActivity(),
                activeTicketCount,
                tenant.getNextScheduledMaintenance()
        );
    }

    /**
     * Account Settings -> Profile. Goes through TenantProfileService, the same
     * code path the admin portal uses to edit a tenant, so both sides stay in step.
     */
    public Tenant updateProfile(UpdateTenantProfileRequest request) {
        return tenantProfileService.update(tenantContext.currentTenant(), request);
    }
}
