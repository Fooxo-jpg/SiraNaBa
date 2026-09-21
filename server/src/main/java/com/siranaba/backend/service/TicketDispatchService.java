package com.siranaba.backend.service;

import com.siranaba.backend.model.Specialist;
import com.siranaba.backend.model.Staff;
import com.siranaba.backend.model.Ticket;
import com.siranaba.backend.repository.StaffRepository;
import com.siranaba.backend.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/**
 * Selects a matching technician after triage. The staff collection is the
 * source of truth for the Admin Staff Management workload checker, so each
 * dispatch updates that same record rather than maintaining a separate queue.
 */
@Service
public class TicketDispatchService {

    private static final int WORKLOAD_PER_TICKET = 10;

    private static final Map<String, String> CATEGORY_SPECIALTIES = Map.of(
            "plumbing", "Plumber",
            "electrical", "Electrician",
            "electricity", "Electrician",
            "electrician", "Electrician",
            "hvac", "HVAC Specialist",
            "appliance", "General Repair",
            "locksmith", "General Repair",
            "structural", "General Repair",
            "pest control", "General Repair",
            "other", "General Repair"
    );

    private final StaffRepository staffRepository;

    public TicketDispatchService(StaffRepository staffRepository) {
        this.staffRepository = staffRepository;
    }

    /**
     * Returns the assigned staff member, or empty when the roster has no
     * technician with the required specialty.
     */
    public Optional<Staff> assign(Ticket ticket) {
        String requiredSpecialty = specialtyFor(ticket);
        List<Staff> candidates = staffRepository.findAll().stream()
                .filter(staff -> requiredSpecialty.equalsIgnoreCase(canonicalSpecialty(staff.getSpecialty())))
                // Equal active-ticket counts are the primary balancing rule;
                // reported utilization safely breaks ties between equal counts.
                .sorted(Comparator.comparingInt(Staff::getTickets)
                        .thenComparingInt(Staff::getWorkload)
                        .thenComparing(Staff::getStaffCode, Comparator.nullsLast(String::compareTo)))
                .toList();

        if (candidates.isEmpty()) {
            return Optional.empty();
        }

        Staff selected = candidates.get(0);
        selected.setTickets(selected.getTickets() + 1);
        selected.setWorkload(Math.min(100, selected.getWorkload() + WORKLOAD_PER_TICKET));
        return Optional.of(staffRepository.save(selected));
    }

    /** Applies a staff member deliberately chosen by an administrator. */
    public Staff assign(Ticket ticket, String staffId) {
        Staff selected = staffRepository.findById(staffId)
                .orElseThrow(() -> new ResourceNotFoundException("Staff member not found."));
        selected.setTickets(selected.getTickets() + 1);
        selected.setWorkload(Math.min(100, selected.getWorkload() + WORKLOAD_PER_TICKET));
        return staffRepository.save(selected);
    }

    /** Releases one active ticket from the assigned technician after a fix. */
    public void release(Ticket ticket) {
        Optional<Staff> assigned = ticket.getAssignedStaffId() == null
                ? Optional.empty()
                : staffRepository.findById(ticket.getAssignedStaffId());
        if (assigned.isEmpty() && ticket.getSpecialist() != null) {
            assigned = staffRepository.findFirstByNameIgnoreCase(ticket.getSpecialist().getName());
        }
        assigned.ifPresent(staff -> {
            staff.setTickets(Math.max(0, staff.getTickets() - 1));
            staff.setWorkload(Math.max(0, staff.getWorkload() - WORKLOAD_PER_TICKET));
            staffRepository.save(staff);
        });
    }

    public Specialist specialistFor(Staff staff, String estimatedCompletion) {
        return new Specialist(
                staff.getName(),
                staff.getSpecialty(),
                0,
                0,
                estimatedCompletion == null || estimatedCompletion.isBlank() ? "Scheduling shortly" : estimatedCompletion,
                "Assigned",
                staff.getPhone()
        );
    }

    private String specialtyFor(Ticket ticket) {
        String category = ticket.getCategory() == null ? "" : ticket.getCategory().toLowerCase(Locale.ROOT).trim();
        String mapped = CATEGORY_SPECIALTIES.get(category);
        if (mapped != null) {
            return mapped;
        }

        String issue = (ticket.getCategory() + " " + ticket.getTitle() + " " + ticket.getDescription()).toLowerCase(Locale.ROOT);
        if (issue.contains("electri") || issue.contains("wire") || issue.contains("power")) return "Electrician";
        if (issue.contains("plumb") || issue.contains("leak") || issue.contains("drain")) return "Plumber";
        if (issue.contains("hvac") || issue.contains("air condition") || issue.contains("heating")) return "HVAC Specialist";
        return "General Repair";
    }

    /** Maps accepted label variants to the role used for dispatch comparisons. */
    private String canonicalSpecialty(String specialty) {
        if (specialty == null) return "";
        String value = specialty.toLowerCase(Locale.ROOT).trim();
        if (value.contains("electric")) return "Electrician";
        if (value.contains("plumb")) return "Plumber";
        if (value.contains("hvac") || value.contains("air condition") || value.contains("heating")) return "HVAC Specialist";
        if (value.contains("clean")) return "Cleaner";
        if (value.contains("general") || value.contains("repair") || value.contains("structural")) return "General Repair";
        return specialty.trim();
    }
}
