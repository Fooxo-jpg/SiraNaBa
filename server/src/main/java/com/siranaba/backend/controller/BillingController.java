package com.siranaba.backend.controller;

import com.siranaba.backend.dto.AddPaymentMethodRequest;
import com.siranaba.backend.dto.PayRequest;
import com.siranaba.backend.dto.PaymentReceipt;
import com.siranaba.backend.model.Billing;
import com.siranaba.backend.service.BillingService;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
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

    @PostMapping("/api/billing/payment-methods")
    public Billing addPaymentMethod(@RequestBody AddPaymentMethodRequest request) {
        return billingService.addPaymentMethod(request);
    }

    @PatchMapping("/api/billing/payment-methods/{id}/primary")
    public Billing setPrimary(@PathVariable String id) {
        return billingService.setPrimary(id);
    }

    @DeleteMapping("/api/billing/payment-methods/{id}")
    public Billing removePaymentMethod(@PathVariable String id) {
        return billingService.removePaymentMethod(id);
    }

    @PostMapping("/api/billing/pay")
    public PaymentReceipt pay(@RequestBody PayRequest request) {
        return billingService.pay(request);
    }
}
