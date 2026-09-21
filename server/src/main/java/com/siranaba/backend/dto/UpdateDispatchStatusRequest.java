package com.siranaba.backend.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateDispatchStatusRequest(@NotBlank String status) {
}
