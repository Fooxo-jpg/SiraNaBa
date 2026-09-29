package com.siranaba.backend.controller;

import com.siranaba.backend.dto.CreateFacilityMaintenanceRequest;
import com.siranaba.backend.dto.FacilityMaintenanceResponse;
import com.siranaba.backend.service.FacilityMaintenanceService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/maintenance-schedules")
public class FacilityMaintenanceController {
    private final FacilityMaintenanceService service;
    public FacilityMaintenanceController(FacilityMaintenanceService service) { this.service = service; }

    @GetMapping public List<FacilityMaintenanceResponse> list() { return service.listUpcoming(); }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public FacilityMaintenanceResponse create(@Valid @RequestBody CreateFacilityMaintenanceRequest request) {
        return service.create(request);
    }
}
