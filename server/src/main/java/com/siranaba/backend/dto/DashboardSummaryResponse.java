package com.siranaba.backend.dto;

import com.siranaba.backend.model.ActivityItem;
import com.siranaba.backend.model.ManagementTool;
import com.siranaba.backend.model.ScheduledMaintenance;
import com.siranaba.backend.model.Tenant;
import com.siranaba.backend.model.UtilityUsage;

import java.util.List;

public record DashboardSummaryResponse(
        Tenant tenant,
        UtilityUsage utilityUsage,
        List<ManagementTool> managementTools,
        List<ActivityItem> recentActivity,
        long activeTicketCount,
        ScheduledMaintenance nextScheduledMaintenance
) {
}
