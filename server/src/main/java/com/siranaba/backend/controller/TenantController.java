package com.siranaba.backend.controller;

import com.siranaba.backend.dto.UpdateTenantProfileRequest;
import com.siranaba.backend.model.Tenant;
import com.siranaba.backend.service.DashboardService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
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

    /** Account Settings -> Profile -> Save Changes. */
    @PatchMapping("/api/tenant")
    public Tenant updateTenant(@Valid @RequestBody UpdateTenantProfileRequest request) {
        return dashboardService.updateProfile(request);
    }
}
