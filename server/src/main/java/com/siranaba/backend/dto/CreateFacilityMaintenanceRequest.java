package com.siranaba.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public record CreateFacilityMaintenanceRequest(
        List<String> roomIds,
        List<String> floorIds,
        @NotBlank String scheduledAt,
        @NotBlank @Size(max = 500) String reason
) {}
