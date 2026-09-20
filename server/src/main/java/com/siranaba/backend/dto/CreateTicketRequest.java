package com.siranaba.backend.dto;

import com.siranaba.backend.model.Attachment;
import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record CreateTicketRequest(
        @NotBlank String category,
        @NotBlank String title,
        @NotBlank String description,
        @NotBlank String location,
        List<Attachment> attachments
) {
}
