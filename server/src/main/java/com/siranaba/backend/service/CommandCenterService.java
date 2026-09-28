package com.siranaba.backend.service;

import com.siranaba.backend.model.Ticket;
import com.siranaba.backend.model.TimelineEvent;
import com.siranaba.backend.repository.TicketRepository;
import com.siranaba.backend.repository.TenantRepository;
import org.springframework.stereotype.Service;
import java.lang.management.ManagementFactory;
import java.time.*;
import java.util.*;

@Service
public class CommandCenterService {
    private final TicketRepository tickets;
    private final TenantRepository tenants;
    public CommandCenterService(TicketRepository tickets, TenantRepository tenants) {
        this.tickets = tickets;
        this.tenants = tenants;
    }
    public record Metrics(long activeIncidents, Long yesterdayActiveIncidents, long pendingDispatch,
                          long totalTenants, long uptimeSeconds, Double averageAutoAssignmentSeconds,
                          long autoAssignmentSamples) {}

    public Metrics metrics() {
        return calculate(tickets.findAll(), tenants.count(), Instant.now(),
                ManagementFactory.getRuntimeMXBean().getUptime() / 1000);
    }

    static Metrics calculate(List<Ticket> tickets, long tenants, Instant now, long uptime) {
        Instant midnight = now.atZone(ZoneId.of("Asia/Manila")).toLocalDate()
                .atStartOfDay(ZoneId.of("Asia/Manila")).toInstant();
        long active = 0, pending = 0, yesterday = 0, samples = 0;
        double seconds = 0;
        boolean historyKnown = true;
        for (Ticket ticket : tickets) {
            boolean open = !"Resolved".equals(ticket.getStage()) && !"Cancelled".equals(ticket.getStage());
            if (open) {
                active++;
                String name = ticket.getSpecialist() == null ? null : ticket.getSpecialist().getName();
                if ((ticket.getAssignedStaffId() == null || ticket.getAssignedStaffId().isBlank())
                        && (name == null || name.isBlank() || "Unassigned".equalsIgnoreCase(name))) pending++;
            }
            List<TimelineEvent> events = ticket.getTimeline() == null ? List.of() : ticket.getTimeline();
            Instant submitted = ticket.getSubmittedAt();
            if (submitted == null) historyKnown = false;
            else if (submitted.isBefore(midnight)) {
                if (open) yesterday++;
                else {
                    Instant closed = events.stream().filter(e -> e.getTimestamp() != null &&
                            Set.of("Fixed Problem", "Resolved", "Cancelled", "Request cancelled").contains(e.getTitle() == null ? "" : e.getTitle()))
                            .map(TimelineEvent::getTimestamp).min(Instant::compareTo).orElse(null);
                    if (closed == null) historyKnown = false;
                    else if (!closed.isBefore(midnight)) yesterday++;
                }
            }
            Instant assigned = ticket.getAutoAssignedAt();
            // Older automatic assignments have a distinct persisted timeline description.
            if (assigned == null) assigned = events.stream().filter(e ->
                    "Maintenance staff assigned".equals(e.getTitle()) && e.getDetail() != null
                            && e.getDetail().endsWith(" was assigned to this ticket.") && e.getTimestamp() != null)
                    .map(TimelineEvent::getTimestamp).min(Instant::compareTo).orElse(null);
            if (submitted != null && assigned != null && !assigned.isBefore(submitted) && !assigned.isAfter(now)) {
                seconds += Duration.between(submitted, assigned).toMillis() / 1000.0;
                samples++;
            }
        }
        return new Metrics(active, historyKnown ? yesterday : null, pending, tenants, uptime,
                samples == 0 ? null : seconds / samples, samples);
    }
}
