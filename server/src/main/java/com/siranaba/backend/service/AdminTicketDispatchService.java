package com.siranaba.backend.service;

import com.siranaba.backend.exception.ApiException;
import com.siranaba.backend.exception.ResourceNotFoundException;
import com.siranaba.backend.model.Ticket;
import com.siranaba.backend.model.TimelineEvent;
import com.siranaba.backend.model.NotificationDoc;
import com.siranaba.backend.model.Cta;
import com.siranaba.backend.repository.NotificationRepository;
import com.siranaba.backend.repository.TicketRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.UUID;

/** Performs a deliberate staff selection from the admin Rapid Dispatch queue. */
@Service
public class AdminTicketDispatchService {

    private final TicketRepository ticketRepository;
    private final TicketDispatchService ticketDispatchService;
    private final NotificationRepository notificationRepository;

    public AdminTicketDispatchService(TicketRepository ticketRepository, TicketDispatchService ticketDispatchService,
                                      NotificationRepository notificationRepository) {
        this.ticketRepository = ticketRepository;
        this.ticketDispatchService = ticketDispatchService;
        this.notificationRepository = notificationRepository;
    }

    public Ticket assign(String ticketId, String staffId) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found."));
        if (ticket.getSpecialist() != null && !"Unassigned".equalsIgnoreCase(ticket.getSpecialist().getName())) {
            throw new ApiException(HttpStatus.CONFLICT, "This ticket is already assigned.");
        }

        var staff = ticketDispatchService.assign(ticket, staffId);
        Instant now = Instant.now();
        ticket.setSpecialist(ticketDispatchService.specialistFor(staff, ticket.getEstimatedCompletion()));
        ticket.setAssignedStaffId(staff.getId());
        ticket.setStage("Assigned");
        ticket.setDispatchStatus("Assigned");
        ticket.setUpdatedAt(now);
        var timeline = new ArrayList<>(ticket.getTimeline());
        timeline.add(new TimelineEvent(
                "tl_" + UUID.randomUUID(),
                "Maintenance staff assigned",
                staff.getName() + " (" + staff.getSpecialty() + ") was assigned by an administrator.",
                now));
        ticket.setTimeline(timeline);
        return ticketRepository.save(ticket);
    }

    public Ticket updateDispatchStatus(String ticketId, String status) {
        if (!java.util.Set.of("Fixed Problem", "Escalated", "Cancelled").contains(status)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Unsupported dispatch status.");
        }
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found."));
        Instant now = Instant.now();
        boolean newlyFixed = "Fixed Problem".equals(status) && !"Fixed Problem".equals(ticket.getDispatchStatus());
        if (newlyFixed && !"Resolved".equals(ticket.getStage())) {
            ticketDispatchService.release(ticket);
            ticket.setStage("Resolved");
            notifyTenantOfResolution(ticket, now);
        }
        ticket.setDispatchStatus(status);
        ticket.setUpdatedAt(now);
        var timeline = new ArrayList<>(ticket.getTimeline());
        timeline.add(new TimelineEvent("tl_" + UUID.randomUUID(), status, "Dispatch status updated to " + status + ".", now));
        ticket.setTimeline(timeline);
        return ticketRepository.save(ticket);
    }

    private void notifyTenantOfResolution(Ticket ticket, Instant now) {
        NotificationDoc notification = new NotificationDoc();
        notification.setTenantId(ticket.getTenantId());
        notification.setCategory("Maintenance");
        notification.setTitle("Maintenance request resolved");
        notification.setBody("Your ticket " + ticket.getId() + " (" + ticket.getTitle() + ") has been marked as fixed.");
        notification.setTimestamp(now);
        notification.setCta(new Cta("View resolved ticket", "/maintenance/" + ticket.getId()));
        notification.setRead(false);
        notificationRepository.save(notification);
    }
}
