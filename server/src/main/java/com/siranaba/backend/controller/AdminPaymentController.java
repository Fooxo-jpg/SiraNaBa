package com.siranaba.backend.controller;

import com.siranaba.backend.dto.AdminPaymentResponse;
import com.siranaba.backend.dto.TenantPaymentsResponse;
import com.siranaba.backend.service.AdminPaymentService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Admin-only (enforced in SecurityConfig: /api/admin/** requires the ADMIN role). */
@RestController
@RequestMapping("/api/admin/payments")
public class AdminPaymentController {

    private final AdminPaymentService paymentService;

    public AdminPaymentController(AdminPaymentService paymentService) {
        this.paymentService = paymentService;
    }

    /** Latest payments from every tenant (reference code, mode, time, amount). */
    @GetMapping
    public List<AdminPaymentResponse> recent(@RequestParam(defaultValue = "10") int limit) {
        return paymentService.recent(limit);
    }

    /** One tenant's full payment history and saved payment methods. */
    @GetMapping("/tenant/{tenantId}")
    public TenantPaymentsResponse forTenant(@PathVariable String tenantId) {
        return paymentService.forTenant(tenantId);
    }
}
