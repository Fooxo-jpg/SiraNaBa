package com.siranaba.backend.service;

import com.siranaba.backend.dto.CreateStaffRequest;
import com.siranaba.backend.dto.StaffResponse;
import com.siranaba.backend.dto.UpdateStaffRequest;
import com.siranaba.backend.exception.ResourceNotFoundException;
import com.siranaba.backend.model.Staff;
import com.siranaba.backend.repository.StaffRepository;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Maintenance Staff Management. Reads and writes the "staff" collection so
 * the workforce roster is real data instead of a hardcoded array on the
 * front end.
 */
@Service
public class StaffService {

    private static final Pattern CODE = Pattern.compile("^ST-(\\d+)$");

    private final StaffRepository staffRepository;

    public StaffService(StaffRepository staffRepository) {
        this.staffRepository = staffRepository;
    }

    public List<StaffResponse> list() {
        return staffRepository.findAll().stream()
                .sorted(Comparator.comparingInt((Staff s) -> number(s.getStaffCode())))
                .map(StaffService::toResponse)
                .toList();
    }

    /** New hires start offline with no workload/tickets until they're dispatched. */
    public StaffResponse create(CreateStaffRequest request) {
        Staff staff = new Staff();
        staff.setStaffCode(nextCode());
        staff.setName(request.name().trim());
        staff.setSpecialty(request.specialty());
        staff.setAvailability("offline");
        staff.setWorkload(0);
        staff.setTickets(0);
        staff.setEmail(generateEmail(request.name()));
        staff.setPhone(request.phone() == null || request.phone().isBlank() ? "—" : request.phone().trim());
        return toResponse(staffRepository.save(staff));
    }

    public StaffResponse update(String staffId, UpdateStaffRequest request) {
        Staff staff = find(staffId);
        if (request.name() != null && !request.name().isBlank()) {
            staff.setName(request.name().trim());
        }
        if (request.specialty() != null && !request.specialty().isBlank()) {
            staff.setSpecialty(request.specialty());
        }
        if (request.availability() != null && !request.availability().isBlank()) {
            staff.setAvailability(request.availability());
        }
        if (request.workload() != null) {
            staff.setWorkload(Math.max(0, Math.min(100, request.workload())));
        }
        if (request.tickets() != null) {
            staff.setTickets(Math.max(0, request.tickets()));
        }
        if (request.phone() != null && !request.phone().isBlank()) {
            staff.setPhone(request.phone().trim());
        }
        return toResponse(staffRepository.save(staff));
    }

    /** "Mark Online/Offline" quick action from the staff table row menu. */
    public StaffResponse toggleAvailability(String staffId) {
        Staff staff = find(staffId);
        staff.setAvailability("online".equals(staff.getAvailability()) ? "offline" : "online");
        return toResponse(staffRepository.save(staff));
    }

    public void remove(String staffId) {
        if (!staffRepository.existsById(staffId)) {
            throw new ResourceNotFoundException("Staff member not found.");
        }
        staffRepository.deleteById(staffId);
    }

    private Staff find(String staffId) {
        return staffRepository.findById(staffId)
                .orElseThrow(() -> new ResourceNotFoundException("Staff member not found."));
    }

    /** Next free code: one above the highest "ST-###" in use, starting at ST-201. */
    private String nextCode() {
        int max = staffRepository.findAll().stream()
                .mapToInt(s -> number(s.getStaffCode()))
                .max()
                .orElse(200);
        return "ST-" + Math.max(max + 1, 201);
    }

    private static String generateEmail(String name) {
        String[] parts = name.trim().toLowerCase(Locale.ENGLISH).split("\\s+");
        String first = parts[0].substring(0, 1);
        String last = parts[parts.length - 1];
        return first + "." + last + "@siranaba.com";
    }

    private static int number(String code) {
        if (code == null) {
            return 0;
        }
        Matcher m = CODE.matcher(code);
        return m.matches() ? Integer.parseInt(m.group(1)) : 0;
    }

    private static StaffResponse toResponse(Staff s) {
        return new StaffResponse(
                s.getId(), s.getStaffCode(), s.getName(), s.getSpecialty(),
                s.getAvailability(), s.getWorkload(), s.getTickets(), s.getEmail(), s.getPhone());
    }
}
