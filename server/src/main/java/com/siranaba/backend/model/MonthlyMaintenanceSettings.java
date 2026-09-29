package com.siranaba.backend.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Data
@Document(collection = "app_settings")
public class MonthlyMaintenanceSettings {
    @Id private String id = "monthly-maintenance";
    private int dayOfMonth = 20;
    /** How many days before an unpaid rent due date its invoice is delivered. */
    private int invoiceNoticeDays = 7;
    private String effectiveDate;
    private String revision;
    private Instant changedAt;
    private List<String> pendingTenantIds = new ArrayList<>();
}
