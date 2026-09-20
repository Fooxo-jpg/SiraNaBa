package com.siranaba.backend.controller;

import com.siranaba.backend.model.Tenant;
import com.siranaba.backend.service.DashboardService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class TenantController {

    private final DashboardService dashboardService;

    public TenantController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/api/tenant")
    public Tenant getTenant() {
        return dashboardService.getTenant();
    }
}
