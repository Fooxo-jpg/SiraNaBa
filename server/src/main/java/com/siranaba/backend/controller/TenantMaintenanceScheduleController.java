package com.siranaba.backend.controller;

import com.siranaba.backend.dto.FacilityMaintenanceResponse;
import com.siranaba.backend.service.FacilityMaintenanceService;
import com.siranaba.backend.service.TenantContext;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/maintenance-schedules")
public class TenantMaintenanceScheduleController {
    private final FacilityMaintenanceService schedules;
    private final TenantContext tenants;

    public TenantMaintenanceScheduleController(FacilityMaintenanceService schedules, TenantContext tenants) {
        this.schedules = schedules;
        this.tenants = tenants;
    }

    @GetMapping
    public List<FacilityMaintenanceResponse> list() {
        return schedules.listForRoom(tenants.currentTenant().getRoomId());
    }
}
