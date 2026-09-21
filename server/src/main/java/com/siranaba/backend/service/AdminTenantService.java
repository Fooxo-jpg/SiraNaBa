package com.siranaba.backend.service;

import com.siranaba.backend.dto.AdminTenantResponse;
import com.siranaba.backend.dto.PresentBillRequest;
import com.siranaba.backend.dto.PresentBillResponse;
import com.siranaba.backend.dto.UpdateTenantProfileRequest;
import com.siranaba.backend.exception.ResourceNotFoundException;
import com.siranaba.backend.model.Billing;
import com.siranaba.backend.model.Cta;
import com.siranaba.backend.model.NotificationDoc;
import com.siranaba.backend.model.Tenant;
import com.siranaba.backend.repository.BillingRepository;
import com.siranaba.backend.repository.NotificationRepository;
import com.siranaba.backend.repository.TenantRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

/**
 * Admin-side view of the tenants collection. It reads and writes the very same
 * Tenant documents the tenant portal uses, so whichever side edits a tenant,
 * the other side sees it on its next fetch.
 */
@Service
public class AdminTenantService {

    private static final double PARKING_FEE = 1000.0;

    private final TenantRepository tenantRepository;
    private final BillingRepository billingRepository;
    private final NotificationRepository notificationRepository;
    private final TenantProfileService profileService;
    private final TenantCodeService codeService;

    public AdminTenantService(TenantRepository tenantRepository, BillingRepository billingRepository,
                              NotificationRepository notificationRepository,
                              TenantProfileService profileService, TenantCodeService codeService) {
        this.tenantRepository = tenantRepository;
        this.billingRepository = billingRepository;
        this.notificationRepository = notificationRepository;
        this.profileService = profileService;
        this.codeService = codeService;
    }

    public List<AdminTenantResponse> list() {
        codeService.assignMissingCodes();
        return tenantRepository.findAll().stream()
                .sorted(Comparator.comparingInt((Tenant t) -> TenantCodeService.number(t.getTenantCode())))
                .map(AdminTenantService::toResponse)
                .toList();
    }

    /** Admin edits a tenant's name / email / phone - same rules as the tenant editing their own profile. */
    public AdminTenantResponse updateProfile(String tenantId, UpdateTenantProfileRequest request) {
        return toResponse(profileService.update(find(tenantId), request));
    }

    /**
     * Clears the tenant's outstanding balance. The tenant's Billing page and
     * dashboard both read that balance, so they show it as paid too; a
     * transaction and a notification are added so they can see what happened.
     */
    public AdminTenantResponse markPaid(String tenantId) {
        Tenant tenant = find(tenantId);
        double amount = tenant.getCurrentBalance();
        if (amount <= 0) {
            return toResponse(tenant); // already settled; nothing to record
        }

        tenant.setCurrentBalance(0);
        tenant = tenantRepository.save(tenant);

        Billing billing = billingRepository.findByTenantId(tenantId).orElseGet(() -> Billing.empty(tenantId));
        List<Billing.Transaction> transactions = new ArrayList<>(billing.getTransactions());
        Instant paidAt = Instant.now();
        transactions.add(0, new Billing.Transaction(
                PaymentReferences.next(paidAt),
                "Rent payment (recorded by management)",
                LocalDate.now().toString(),
                amount,
                "Successful",
                "Recorded by management",
                paidAt));
        billing.setTransactions(transactions);
        billing.setTotalTransactionCount(billing.getTotalTransactionCount() + 1);
        billing.setBreakdown(new ArrayList<>());
        billingRepository.save(billing);

        NotificationDoc note = new NotificationDoc();
        note.setTenantId(tenantId);
        note.setCategory("Payments");
        note.setTitle("Payment received");
        note.setBody(String.format(Locale.ENGLISH,
                "Building management recorded your payment of PHP %,.2f. Your balance is now clear.", amount));
        note.setTimestamp(Instant.now());
        note.setCta(new Cta("View Billing", "/billing"));
        notificationRepository.save(note);

        return toResponse(tenant);
    }

    /**
     * Publishes a standalone utility statement. Utility charges are calculated
     * from the readings and rates supplied by management; monthly rent is billed
     * separately and is intentionally not included here. This replaces the
     * current statement breakdown rather than creating a payment transaction.
     */
    public PresentBillResponse presentBill(String tenantId, PresentBillRequest request) {
        Tenant tenant = find(tenantId);
        double waterCharge = request.waterUsage() * request.waterRate();
        double electricityCharge = request.electricityUsage() * request.electricityRate();
        double parkingCharge = request.parkingFee() ? PARKING_FEE : 0;
        double total = waterCharge + electricityCharge + parkingCharge;

        Billing billing = billingRepository.findByTenantId(tenantId).orElseGet(() -> Billing.empty(tenantId));
        billing.setBreakdown(List.of(
                new Billing.BreakdownLine("Water (" + request.waterUsage() + " m³ × PHP " + request.waterRate() + ")", waterCharge),
                new Billing.BreakdownLine("Electricity (" + request.electricityUsage() + " kWh × PHP " + request.electricityRate() + ")", electricityCharge),
                new Billing.BreakdownLine("Parking fee", parkingCharge)
        ).stream().filter(line -> line.getAmount() > 0).toList());
        billing.setUtilityBreakdowns(List.of(
                new Billing.UtilityBreakdown("water", "Water", request.waterUsage(), "m³", "PHP " + request.waterRate() + " / m³", "neutral", 0),
                new Billing.UtilityBreakdown("electricity", "Electricity", request.electricityUsage(), "kWh", "PHP " + request.electricityRate() + " / kWh", "neutral", 0)
        ));
        billingRepository.save(billing);

        tenant.setCurrentBalance(total);
        tenantRepository.save(tenant);

        NotificationDoc note = new NotificationDoc();
        note.setTenantId(tenantId);
        note.setCategory("Payments");
        note.setTitle("New bill available");
        note.setBody(String.format(Locale.ENGLISH,
                "Your new monthly bill of PHP %,.2f is available. Please review the rent and utility breakdown.", total));
        note.setTimestamp(Instant.now());
        note.setCta(new Cta("View Billing", "/billing"));
        notificationRepository.save(note);

        return new PresentBillResponse(tenantId, waterCharge, electricityCharge, parkingCharge, total, tenant.getRentDueDate());
    }

    private Tenant find(String tenantId) {
        return tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant not found."));
    }

    private static AdminTenantResponse toResponse(Tenant t) {
        LocalDate today = LocalDate.now();
        LocalDate due = parseDate(t.getRentDueDate());
        LocalDate start = parseDate(t.getLeaseStart());

        String payment = t.getCurrentBalance() <= 0
                ? "Paid"
                : (due != null && due.isBefore(today) ? "Overdue" : "Pending");
        String occupancy = start != null && start.isAfter(today) ? "Scheduled" : "Active";
        String account = "Overdue".equals(payment) ? "Delinquent" : "Good Standing";

        String first = t.getFirstName() == null ? "" : t.getFirstName();
        String last = t.getLastName() == null ? "" : t.getLastName();

        return new AdminTenantResponse(
                t.getId(), t.getTenantCode(), first, last, (first + " " + last).trim(),
                t.getEmail(), t.getPhone(), t.getRoomId(), t.getTower(), t.getBuilding(), t.getUnit(),
                t.getUnitType(), t.getLeaseStart(), t.getMonthlyRent(), t.getRentDueDate(),
                t.getCurrentBalance(), occupancy, payment, account);
    }

    private static LocalDate parseDate(String iso) {
        if (iso == null || iso.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(iso);
        } catch (DateTimeParseException ex) {
            return null;
        }
    }
}
