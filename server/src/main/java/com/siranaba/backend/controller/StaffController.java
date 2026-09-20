package com.siranaba.backend.controller;

import com.siranaba.backend.dto.CreateStaffRequest;
import com.siranaba.backend.dto.StaffResponse;
import com.siranaba.backend.dto.UpdateStaffRequest;
import com.siranaba.backend.service.StaffService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Admin-only (enforced in SecurityConfig: /api/admin/** requires the ADMIN role). */
@RestController
@RequestMapping("/api/admin/staff")
public class StaffController {

    private final StaffService staffService;

    public StaffController(StaffService staffService) {
        this.staffService = staffService;
    }

    @GetMapping
    public List<StaffResponse> list() {
        return staffService.list();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public StaffResponse create(@Valid @RequestBody CreateStaffRequest request) {
        return staffService.create(request);
    }

    @PatchMapping("/{staffId}")
    public StaffResponse update(@PathVariable String staffId, @RequestBody UpdateStaffRequest request) {
        return staffService.update(staffId, request);
    }

    @PostMapping("/{staffId}/toggle-availability")
    public StaffResponse toggleAvailability(@PathVariable String staffId) {
        return staffService.toggleAvailability(staffId);
    }

    @DeleteMapping("/{staffId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(@PathVariable String staffId) {
        staffService.remove(staffId);
    }
}
