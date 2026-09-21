package com.siranaba.backend.service;

import com.siranaba.backend.dto.TriageResult;
import com.siranaba.backend.model.Ticket;
import com.siranaba.backend.model.TimelineEvent;
import com.siranaba.backend.repository.TicketRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * A persisted, single-worker FIFO triage queue. Tickets are saved with the
 * visible "Loading..." state, then the oldest waiting ticket is sent to Gemini.
 * One scheduled worker and a delay after each completed request prevent bursts
 * of Gemini calls from hitting the provider's rate limit.
 */
@Service
public class TicketTriageQueue {

    public static final String QUEUED_PRIORITY = "Loading...";

    private final TicketRepository ticketRepository;
    private final GeminiTriageService geminiTriageService;
    private final TicketDispatchService ticketDispatchService;
    private final AtomicBoolean processing = new AtomicBoolean(false);

    public TicketTriageQueue(TicketRepository ticketRepository, GeminiTriageService geminiTriageService,
                             TicketDispatchService ticketDispatchService) {
        this.ticketRepository = ticketRepository;
        this.geminiTriageService = geminiTriageService;
        this.ticketDispatchService = ticketDispatchService;
    }

    @Scheduled(fixedDelayString = "${app.gemini.triage-delay-ms:1500}", initialDelay = 500)
    public void processOldestWaitingTicket() {
        if (!processing.compareAndSet(false, true)) return;
        try {
            Ticket ticket = ticketRepository.findFirstByPriorityOrderBySubmittedAtAsc(QUEUED_PRIORITY).orElse(null);
            if (ticket == null) return;

            TriageResult result = geminiTriageService.triage(
                    ticket.getCategory(), ticket.getTitle(), ticket.getDescription(), ticket.getLocation(), ticket.getAttachments());
            Instant now = Instant.now();
            ticket.setPriority(result.priority());
            ticket.setSafetyNote(result.safetyNote());
            ticket.setEstimatedCompletion(result.estimatedCompletion());
            ticket.setUpdatedAt(now);
            var timeline = new ArrayList<>(ticket.getTimeline());
            timeline.add(new TimelineEvent(
                    "tl_" + UUID.randomUUID(),
                    "AI severity evaluated",
                    "Gemini assessed this request as " + result.priority() + ".",
                    now));
            if (!assign(ticket, timeline, now)) {
                timeline.add(new TimelineEvent(
                        "tl_" + UUID.randomUUID(),
                        "Awaiting matching staff",
                        "No " + requiredSpecialty(ticket) + " is currently registered for dispatch.",
                        now));
            }
            ticket.setTimeline(timeline);
            ticketRepository.save(ticket);
        } finally {
            processing.set(false);
        }
    }

    /**
     * Revisits the complete unassigned backlog. This catches tickets created
     * before auto-dispatch and automatically assigns tickets that were waiting
     * for a matching staff member to be added to the roster.
     */
    @Scheduled(fixedDelayString = "${app.ticket.dispatch-delay-ms:5000}", initialDelay = 1000)
    public void processUnassignedTickets() {
        if (!processing.compareAndSet(false, true)) return;
        try {
            for (Ticket ticket : ticketRepository.findAllByOrderBySubmittedAtAsc()) {
                if (!isDispatchableUnassigned(ticket)) continue;

                Instant now = Instant.now();
                var timeline = new ArrayList<>(ticket.getTimeline());
                if (assign(ticket, timeline, now)) {
                    ticket.setTimeline(timeline);
                    ticket.setUpdatedAt(now);
                    ticketRepository.save(ticket);
                }
            }
        } finally {
            processing.set(false);
        }
    }

    private boolean assign(Ticket ticket, ArrayList<TimelineEvent> timeline, Instant now) {
        return ticketDispatchService.assign(ticket).map(staff -> {
            ticket.setSpecialist(ticketDispatchService.specialistFor(staff, ticket.getEstimatedCompletion()));
            ticket.setAssignedStaffId(staff.getId());
            ticket.setStage("Assigned");
            ticket.setDispatchStatus("Assigned");
            timeline.add(new TimelineEvent(
                    "tl_" + UUID.randomUUID(),
                    "Maintenance staff assigned",
                    staff.getName() + " (" + staff.getSpecialty() + ") was assigned to this ticket.",
                    now));
            return true;
        }).orElse(false);
    }

    private boolean isDispatchableUnassigned(Ticket ticket) {
        String specialistName = ticket.getSpecialist() == null ? null : ticket.getSpecialist().getName();
        return !QUEUED_PRIORITY.equals(ticket.getPriority())
                && !"Resolved".equals(ticket.getStage())
                && (specialistName == null || "Unassigned".equalsIgnoreCase(specialistName));
    }

    private String requiredSpecialty(Ticket ticket) {
        // Kept human-readable for the tenant activity log; dispatch owns the actual matching rule.
        return switch (ticket.getCategory() == null ? "" : ticket.getCategory()) {
            case "Plumbing" -> "Plumber";
            case "Electrical", "Electricity", "Electrician" -> "Electrician";
            case "HVAC" -> "HVAC Specialist";
            default -> "General Repair specialist";
        };
    }
}
