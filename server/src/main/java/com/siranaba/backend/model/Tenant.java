package com.siranaba.backend.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@Document(collection = "tenants")
public class Tenant {

    @Id
    private String id;

    /**
     * Human-friendly registry ID shown in the admin portal, e.g. "T-0007".
     * Assigned by TenantCodeService when the tenant is registered (or backfilled
     * for tenants created before this field existed).
     */
    private String tenantCode;

    private String firstName;
    private String lastName;
    private String unit;
    private String building;
    private String avatarUrl;

    // Set when the admin registers the tenant (Tenant Management > Authorize Registration).
    private String email;
    private String phone;
    /** Map room id, e.g. "T1-04-02". Unique: one tenant per room. */
    private String roomId;
    private int tower;
    /** Studio | One-Bedroom | Two-Bedroom | Penthouse */
    private String unitType;
    /** PHP, taken from the server-side price list, never from the client. */
    private double monthlyRent;
    /** ISO date, e.g. "2026-10-01". */
    private String leaseStart;

    /** ISO date string, e.g. "2024-11-01" - matches the front end's formatDate helper. */
    private String rentDueDate;
    private double currentBalance;
    private boolean autoPayEnabled;
    private int daysUntilRentDue;

    private UtilityUsage utilityUsage;
    private List<ManagementTool> managementTools = new ArrayList<>();
    private List<ActivityItem> recentActivity = new ArrayList<>();
    private ScheduledMaintenance nextScheduledMaintenance;
    private ServiceHealth serviceHealth;

    @Data
    @NoArgsConstructor
    public static class ServiceHealth {
        private double averageResponseHours;
        private int resolutionRate;
    }
}
