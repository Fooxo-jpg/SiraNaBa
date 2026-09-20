package com.siranaba.backend.dto;

import com.siranaba.backend.model.Attachment;
import com.siranaba.backend.model.Specialist;

import java.util.List;

/**
 * Mirrors the shape of a PATCH /api/tickets/:id body from endpoints.js /
 * TicketDetail.jsx. Every field is optional - only the ones present in the
 * request are applied (see TicketService#applyUpdate), matching the old
 * mock server's Object.assign(ticket, body) semantics.
 */
public record UpdateTicketRequest(
        String category,
        String title,
        String description,
        String location,
        String priority,
        String stage,
        String estimatedCompletion,
        String safetyNote,
        Specialist specialist,
        List<Attachment> attachments
) {
}
