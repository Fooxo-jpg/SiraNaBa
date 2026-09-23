package com.siranaba.backend.service;

import com.siranaba.backend.model.Ticket;
import com.siranaba.backend.repository.TicketRepository;
import org.springframework.stereotype.Service;

/**
 * Produces a tenant-facing first-response window from a ticket's severity and
 * the live maintenance queue. Estimates are deliberately ranges: assignment,
 * travel and diagnosis may change the eventual completion time.
 */
@Service
public class ResponseTimeEstimator {

    private final TicketRepository ticketRepository;

    public ResponseTimeEstimator(TicketRepository ticketRepository) {
        this.ticketRepository = ticketRepository;
    }

    public Estimate forTicket(Ticket ticket, String priority) {
        int waitingAhead = (int) ticketRepository.findAllByOrderBySubmittedAtAsc().stream()
                .filter(other -> !"Resolved".equals(other.getStage()) && !"Cancelled".equals(other.getStage()))
                .filter(other -> sameTrade(other, ticket))
                .filter(other -> rank(other.getPriority()) >= rank(priority))
                .count();

        String base = switch (priority) {
            case "Critical" -> "30 minutes–1 hour";
            case "Severe" -> "1–3 hours";
            case "Medium" -> "4–8 hours";
            default -> "5 hours–1 day";
        };
        String window = switch (priority) {
            case "Critical" -> waitingAhead >= 2 ? "1–2 hours" : base;
            case "Severe" -> waitingAhead >= 3 ? "3–6 hours" : base;
            case "Medium" -> waitingAhead >= 3 ? "8–12 hours" : base;
            default -> waitingAhead >= 3 ? "1–2 days" : base;
        };
        return new Estimate(window, waitingAhead);
    }

    private static boolean sameTrade(Ticket left, Ticket right) {
        String a = left.getCategory() == null ? "" : left.getCategory().trim();
        String b = right.getCategory() == null ? "" : right.getCategory().trim();
        return a.equalsIgnoreCase(b);
    }

    private static int rank(String priority) {
        return switch (priority == null ? "" : priority) {
            case "Critical" -> 4;
            case "Severe" -> 3;
            case "Medium" -> 2;
            case "Low" -> 1;
            default -> 0;
        };
    }

    public record Estimate(String window, int waitingAhead) { }
}
