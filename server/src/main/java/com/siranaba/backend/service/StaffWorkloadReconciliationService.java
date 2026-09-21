package com.siranaba.backend.service;

import com.siranaba.backend.model.Staff;
import com.siranaba.backend.model.Ticket;
import com.siranaba.backend.repository.StaffRepository;
import com.siranaba.backend.repository.TicketRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

/**
 * Keeps staff telemetry aligned with persisted tickets, including tickets
 * created or finished before dispatch telemetry was introduced.
 */
@Service
public class StaffWorkloadReconciliationService {

    private static final int WORKLOAD_PER_TICKET = 10;

    private final TicketRepository ticketRepository;
    private final StaffRepository staffRepository;

    public StaffWorkloadReconciliationService(TicketRepository ticketRepository, StaffRepository staffRepository) {
        this.ticketRepository = ticketRepository;
        this.staffRepository = staffRepository;
    }

    @Scheduled(fixedDelayString = "${app.ticket.workload-reconciliation-delay-ms:5000}", initialDelay = 2000)
    public void reconcile() {
        var staffMembers = staffRepository.findAll();
        Map<String, String> staffIdsByName = new HashMap<>();
        for (Staff staff : staffMembers) {
            if (staff.getName() != null) staffIdsByName.put(staff.getName().trim().toLowerCase(), staff.getId());
        }
        Map<String, Integer> activeAssignments = new HashMap<>();
        for (Ticket ticket : ticketRepository.findAll()) {
            if (!isActiveAssignment(ticket)) continue;
            String staffId = ticket.getAssignedStaffId();
            if ((staffId == null || staffId.isBlank()) && ticket.getSpecialist() != null) {
                staffId = staffIdsByName.get(ticket.getSpecialist().getName().trim().toLowerCase());
            }
            if (staffId != null && !staffId.isBlank()) {
                activeAssignments.merge(staffId, 1, Integer::sum);
            }
        }

        for (Staff staff : staffMembers) {
            int actualTickets = activeAssignments.getOrDefault(staff.getId(), 0);
            if (staff.getTickets() == actualTickets) continue;

            // Preserve any admin-set baseline workload while correcting only
            // the ticket-related portion of the telemetry.
            int correctedWorkload = Math.max(0,
                    Math.min(100, staff.getWorkload() + (actualTickets - staff.getTickets()) * WORKLOAD_PER_TICKET));
            staff.setTickets(actualTickets);
            staff.setWorkload(correctedWorkload);
            staffRepository.save(staff);
        }
    }

    private boolean isActiveAssignment(Ticket ticket) {
        boolean hasAssignedStaff = (ticket.getAssignedStaffId() != null && !ticket.getAssignedStaffId().isBlank())
                || (ticket.getSpecialist() != null && ticket.getSpecialist().getName() != null
                    && !"Unassigned".equalsIgnoreCase(ticket.getSpecialist().getName()));
        return hasAssignedStaff
                && !"Resolved".equals(ticket.getStage())
                && !"Fixed Problem".equals(ticket.getDispatchStatus())
                && !"Cancelled".equals(ticket.getDispatchStatus());
    }
}
