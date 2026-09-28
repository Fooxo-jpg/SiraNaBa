package com.siranaba.backend.dto;

import jakarta.validation.constraints.*;

public record TicketReportDetailsRequest(
        @NotBlank @Size(max = 160) String issueType,
        @NotNull @Positive Integer tower,
        @NotBlank @Size(max = 50) String unit
) {}
