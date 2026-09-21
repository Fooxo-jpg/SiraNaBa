package com.siranaba.backend.dto;

import jakarta.validation.constraints.NotBlank;

/** Staff member selected by an administrator in the Rapid Dispatch queue. */
public record AssignTicketRequest(@NotBlank String staffId) {
}
