package com.siranaba.backend.service;

import com.siranaba.backend.dto.CreateTicketRequest;
import com.siranaba.backend.dto.TicketListResponse;
import com.siranaba.backend.dto.UpdateTicketRequest;
import com.siranaba.backend.exception.ResourceNotFoundException;
import com.siranaba.backend.model.Specialist;
import com.siranaba.backend.model.Tenant;
import com.siranaba.backend.model.Ticket;
import com.siranaba.backend.model.TimelineEvent;
import com.siranaba.backend.repository.TicketRepository;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class TicketService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final TicketRepository ticketRepository;
    private final TenantContext tenantContext;
    private final TicketTriageQueue ticketTriageQueue;

    public TicketService(TicketRepository ticketRepository, TenantContext tenantContext,
                          TicketTriageQueue ticketTriageQueue) {
        this.ticketRepository = ticketRepository;
        this.tenantContext = tenantContext;
        this.ticketTriageQueue = ticketTriageQueue;
    }

    public TicketListResponse list() {
        Tenant tenant = tenantContext.currentTenant();
        List<Ticket> tickets = ticketRepository.findByTenantIdOrderBySubmittedAtDesc(tenant.getId());
        return new TicketListResponse(tickets, tenant.getServiceHealth());
    }

    public Ticket get(String id) {
        String tenantId = tenantContext.currentTenantId();
        return ticketRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found."));
    }

    /** Admin dispatch queue, oldest first so it matches the triage worker order. */
    public List<Ticket> listForAdmin() {
        return ticketRepository.findAllByOrderBySubmittedAtAsc();
    }

    public Ticket create(CreateTicketRequest request) {
        String tenantId = tenantContext.currentTenantId();
        Instant now = Instant.now();

        Ticket ticket = new Ticket();
        ticket.setId(generateTicketId());
        ticket.setTenantId(tenantId);
        ticket.setCategory(request.category());
        ticket.setTitle(request.title());
        ticket.setDescription(request.description());
        ticket.setLocation(request.location());
        ticket.setStage("Submitted");
        ticket.setSubmittedAt(now);
        ticket.setUpdatedAt(now);
        ticket.setSpecialist(Specialist.unassigned());
        ticket.setAttachments(request.attachments() != null ? request.attachments() : List.of());
        ticket.setTimeline(List.of(new TimelineEvent(
                "tl_" + UUID.randomUUID(),
                "Ticket Received",
                "Your request was queued for AI severity assessment.",
                now
        )));
        ticket.setPriority(TicketTriageQueue.QUEUED_PRIORITY);
        ticket.setSafetyNote("");
        ticket.setEstimatedCompletion(null);

        return ticketRepository.save(ticket);
    }

    public Ticket update(String id, UpdateTicketRequest request) {
        Ticket ticket = get(id);

        if (request.category() != null) ticket.setCategory(request.category());
        if (request.title() != null) ticket.setTitle(request.title());
        if (request.description() != null) ticket.setDescription(request.description());
        if (request.location() != null) ticket.setLocation(request.location());
        if (request.priority() != null) ticket.setPriority(request.priority());
        if (request.stage() != null) ticket.setStage(request.stage());
        if (request.estimatedCompletion() != null) ticket.setEstimatedCompletion(request.estimatedCompletion());
        if (request.safetyNote() != null) ticket.setSafetyNote(request.safetyNote());
        if (request.specialist() != null) ticket.setSpecialist(request.specialist());
        if (request.attachments() != null) ticket.setAttachments(request.attachments());

        ticket.setUpdatedAt(Instant.now());
        return ticketRepository.save(ticket);
    }

    private String generateTicketId() {
        int suffix = 1000 + RANDOM.nextInt(9000);
        String candidate = "TKT-" + suffix;
        // Extremely unlikely to collide, but guard against it anyway.
        while (ticketRepository.existsById(candidate)) {
            suffix = 1000 + RANDOM.nextInt(9000);
            candidate = "TKT-" + suffix;
        }
        return candidate;
    }
}
