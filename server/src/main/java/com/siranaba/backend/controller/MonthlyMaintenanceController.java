package com.siranaba.backend.controller;

import com.siranaba.backend.service.MonthlyMaintenanceService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/monthly-maintenance")
public class MonthlyMaintenanceController {
    private final MonthlyMaintenanceService service;
    public MonthlyMaintenanceController(MonthlyMaintenanceService service) { this.service = service; }
    public record Request(@NotBlank String date, Integer invoiceNoticeDays) {}
    @GetMapping public MonthlyMaintenanceService.Schedule get() { return service.get(); }
    @PutMapping public MonthlyMaintenanceService.Saved update(@Valid @RequestBody Request request) {
        return service.update(request.date(), request.invoiceNoticeDays());
    }
}
