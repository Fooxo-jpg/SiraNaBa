package com.siranaba.backend.controller;

import com.siranaba.backend.model.Billing;
import com.siranaba.backend.service.BillingService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class BillingController {

    private final BillingService billingService;

    public BillingController(BillingService billingService) {
        this.billingService = billingService;
    }

    @GetMapping("/api/billing")
    public Billing getBilling() {
        return billingService.getBilling();
    }
}
