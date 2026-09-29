package com.siranaba.backend.service;

import com.siranaba.backend.dto.TriageResult;
import com.siranaba.backend.model.Ticket;
import com.siranaba.backend.model.TimelineEvent;
import com.siranaba.backend.repository.TicketRepository;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.UUID;

@Service
@ConditionalOnProperty(name = "app.rabbitmq.enabled", havingValue = "true")
public class RabbitTicketTriageProcessor {
    private final TicketRepository tickets;
    private final GeminiTriageService gemini;
    private final TicketDispatchService dispatch;
    private final ResponseTimeEstimator estimates;

    public RabbitTicketTriageProcessor(TicketRepository tickets, GeminiTriageService gemini,
                                       TicketDispatchService dispatch, ResponseTimeEstimator estimates) {
        this.tickets = tickets;
        this.gemini = gemini;
        this.dispatch = dispatch;
        this.estimates = estimates;
    }

    public void process(Ticket ticket) {
        TriageResult result = gemini.triage(ticket.getCategory(), ticket.getTitle(), ticket.getDescription(),
                ticket.getLocation(), ticket.getAttachments());
        Instant now = Instant.now();
        ResponseTimeEstimator.Estimate estimate = estimates.forTicket(ticket, result.priority());
        ticket.setPriority(result.priority());
        ticket.setSafetyNote(result.safetyNote());
        ticket.setEstimatedCompletion(estimate.window());
        ticket.setUpdatedAt(now);
        var timeline = new ArrayList<>(ticket.getTimeline());
        timeline.add(new TimelineEvent("tl_" + UUID.randomUUID(), "AI severity evaluated",
                "Gemini assessed this request as " + result.priority() + ". Expected response: " + estimate.window(), now));
        dispatch.assign(ticket).ifPresentOrElse(staff -> {
            if (ticket.getAutoAssignedAt() == null) ticket.setAutoAssignedAt(now);
            ticket.setSpecialist(dispatch.specialistFor(staff, ticket.getEstimatedCompletion()));
            ticket.setAssignedStaffId(staff.getId());
            ticket.setStage("Assigned");
            ticket.setDispatchStatus("Coordinating");
            timeline.add(new TimelineEvent("tl_" + UUID.randomUUID(), "Maintenance staff assigned",
                    staff.getName() + " (" + staff.getSpecialty() + ") was assigned to this ticket.", now));
        }, () -> timeline.add(new TimelineEvent("tl_" + UUID.randomUUID(), "Awaiting matching staff",
                "No matching maintenance specialist is currently registered for dispatch.", now)));
        ticket.setTimeline(timeline);
        tickets.save(ticket);
    }
}
