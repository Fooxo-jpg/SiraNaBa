package com.siranaba.backend.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@Document(collection = "facility_maintenance_schedules")
public class FacilityMaintenanceSchedule {
    @Id private String id;
    private List<String> selectedRoomIds = new ArrayList<>();
    private List<String> selectedFloorIds = new ArrayList<>();
    private List<String> affectedRoomIds = new ArrayList<>();
    @Indexed private Instant scheduledAt;
    private String reason;
    private String status;
    private Instant createdAt;
    private int notifiedTenants;
    private int emailsSent;
    private int emailsFailed;
}
