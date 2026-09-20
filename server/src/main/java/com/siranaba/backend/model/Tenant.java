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

    private String firstName;
    private String lastName;
    private String unit;
    private String building;
    private String avatarUrl;

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
