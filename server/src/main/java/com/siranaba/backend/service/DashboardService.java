package com.siranaba.backend.service;

import com.siranaba.backend.dto.DashboardSummaryResponse;
import com.siranaba.backend.model.Tenant;
import com.siranaba.backend.repository.TicketRepository;
import org.springframework.stereotype.Service;

@Service
public class DashboardService {

    private final TenantContext tenantContext;
    private final TicketRepository ticketRepository;

    public DashboardService(TenantContext tenantContext, TicketRepository ticketRepository) {
        this.tenantContext = tenantContext;
        this.ticketRepository = ticketRepository;
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
}
