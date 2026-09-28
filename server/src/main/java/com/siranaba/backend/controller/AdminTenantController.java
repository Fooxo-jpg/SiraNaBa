package com.siranaba.backend.controller;

import com.siranaba.backend.dto.AdminTenantResponse;
import com.siranaba.backend.dto.PresentBillRequest;
import com.siranaba.backend.dto.PresentBillResponse;
import com.siranaba.backend.dto.RegisterTenantRequest;
import com.siranaba.backend.dto.RegisterTenantResponse;
import com.siranaba.backend.dto.UpdateTenantProfileRequest;
import com.siranaba.backend.service.AdminTenantService;
import com.siranaba.backend.service.TenantRegistrationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Admin-only (enforced in SecurityConfig: /api/admin/** requires the ADMIN role). */
@RestController
@RequestMapping("/api/admin/tenants")
public class AdminTenantController {

    private final TenantRegistrationService registrationService;
    private final AdminTenantService adminTenantService;

    public AdminTenantController(TenantRegistrationService registrationService,
                                 AdminTenantService adminTenantService) {
        this.registrationService = registrationService;
        this.adminTenantService = adminTenantService;
    }

    /** Tenant Management table. Reads the same tenant records the tenant portal does. */
    @GetMapping
    public List<AdminTenantResponse> list() {
        return adminTenantService.list();
    }

    /** Admin edits a tenant's name / email / phone (same effect as the tenant's Account Settings). */
    @PatchMapping("/{tenantId}")
    public AdminTenantResponse update(@PathVariable String tenantId,
                                      @Valid @RequestBody UpdateTenantProfileRequest request) {
        return adminTenantService.updateProfile(tenantId, request);
    }

    /** Existing route retained, but requires an explicit amount, allocation type and retry key. */
    @PostMapping("/{tenantId}/mark-paid")
    public com.siranaba.backend.dto.PaymentReceipt markPaid(@PathVariable String tenantId, @RequestBody com.siranaba.backend.dto.PayRequest request) {
        return adminTenantService.markPaid(tenantId, request);
    }

    /** Creates this month's utility statement, or updates it when it already exists. */
    @PostMapping("/{tenantId}/bills")
    public ResponseEntity<PresentBillResponse> presentBill(@PathVariable String tenantId,
                                                            @Valid @RequestBody PresentBillRequest request) {
        PresentBillResponse response = adminTenantService.presentBill(tenantId, request);
        return ResponseEntity.status(response.updatedExistingStatement() || response.unchanged() ? HttpStatus.OK : HttpStatus.CREATED)
                .body(response);
    }

    @PostMapping("/{tenantId}/billing/reconcile")
    public com.siranaba.backend.model.Billing reconcile(@PathVariable String tenantId, @RequestBody com.siranaba.backend.dto.ReconcileBillingRequest request) {
        return adminTenantService.reconcile(tenantId, request);
    }
    @PostMapping("/{tenantId}/rent")
    public com.siranaba.backend.model.Billing issueRent(@PathVariable String tenantId, @RequestBody AdminTenantService.IssueRentRequest request) {
        return adminTenantService.issueRent(tenantId, request);
    }
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RegisterTenantResponse register(@Valid @RequestBody RegisterTenantRequest request) {
        return registrationService.register(request);
    }

    @DeleteMapping("/{tenantId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(@PathVariable String tenantId) {
        registrationService.remove(tenantId);
    }
}
