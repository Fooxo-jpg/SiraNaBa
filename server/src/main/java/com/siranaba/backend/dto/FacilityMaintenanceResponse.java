package com.siranaba.backend.dto;

import java.time.Instant;
import java.util.List;

public record FacilityMaintenanceResponse(
        String id,
        List<String> selectedRoomIds,
        List<String> selectedFloorIds,
        List<String> affectedRoomIds,
        Instant scheduledAt,
        String reason,
        String status,
        Instant createdAt,
        int notifiedTenants,
        int emailsSent,
        int emailsFailed
) {}
