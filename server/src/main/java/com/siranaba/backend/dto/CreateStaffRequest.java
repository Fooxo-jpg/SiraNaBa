package com.siranaba.backend.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateStaffRequest(
        @NotBlank String name,
        @NotBlank String specialty,
        String phone
) {
}
