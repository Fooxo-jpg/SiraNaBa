package com.siranaba.backend.service;

import com.siranaba.backend.dto.RegisterTenantRequest;
import com.siranaba.backend.dto.RegisterTenantResponse;
import com.siranaba.backend.exception.ApiException;
import com.siranaba.backend.exception.ResourceNotFoundException;
import com.siranaba.backend.model.*;
import com.siranaba.backend.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;

@Service
public class TenantRegistrationService {

    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final BillingRepository billingRepository;
    private final NotificationRepository notificationRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final TenantCodeService tenantCodeService;
    private final AuditLogService auditLogService;

    public TenantRegistrationService(TenantRepository tenantRepository, UserRepository userRepository,
                                     BillingRepository billingRepository, NotificationRepository notificationRepository,
                                     PasswordEncoder passwordEncoder, EmailService emailService,
                                     TenantCodeService tenantCodeService, AuditLogService auditLogService) {
        this.tenantRepository = tenantRepository;
        this.userRepository = userRepository;
        this.billingRepository = billingRepository;
        this.notificationRepository = notificationRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.tenantCodeService = tenantCodeService;
        this.auditLogService = auditLogService;
    }

    public RegisterTenantResponse register(RegisterTenantRequest req) {
        String email = req.email().trim().toLowerCase(Locale.ROOT);
        String fullName = req.fullName().trim().replaceAll("\\s+", " ");

        LocalDate leaseStart;
        try {
            leaseStart = LocalDate.parse(req.leaseStart());
        } catch (DateTimeParseException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Lease start must be a valid date (yyyy-MM-dd).");
        }
        double rent = UnitPricing.monthlyRent(req.unitType()); // also rejects unknown unit types

        if (userRepository.findByEmailIgnoreCase(email).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "An account with this email already exists.");
        }
        if (tenantRepository.existsByRoomId(req.roomId())) {
            throw new ApiException(HttpStatus.CONFLICT, "This unit is already assigned to another tenant.");
        }

        String password = initialPassword(fullName, req.tower(), req.unit());
        LocalDate due = leaseStart.plusMonths(1);
        long daysUntilDue = Math.max(0, ChronoUnit.DAYS.between(LocalDate.now(), due));

        String[] parts = fullName.split(" ");
        Tenant tenant = new Tenant();
        tenant.setTenantCode(tenantCodeService.nextCode());
        tenant.setLastName(parts[parts.length - 1]);
        tenant.setFirstName(parts.length > 1 ? fullName.substring(0, fullName.length() - tenant.getLastName().length()).trim() : "");
        tenant.setEmail(email);
        tenant.setPhone(req.phone() == null ? null : req.phone().trim());
        tenant.setRoomId(req.roomId());
        tenant.setTower(req.tower());
        tenant.setUnit(req.unit().toUpperCase(Locale.ROOT));
        tenant.setUnitType(req.unitType());
        tenant.setBuilding("Tower " + req.tower());
        tenant.setMonthlyRent(rent);
        tenant.setLeaseStart(leaseStart.toString());
        tenant.setRentDueDate(due.toString());
        tenant.setCurrentBalance(rent);
        tenant.setDaysUntilRentDue((int) daysUntilDue);
        tenant.setAutoPayEnabled(false);
        tenant.setManagementTools(List.of(
                new ManagementTool("maintenance", "Maintenance", "Report leaks, electrical issues, or structural repairs.", "wrench", "/maintenance"),
                new ManagementTool("billing", "Billing Center", "View utility breakdowns and download past invoices.", "history", "/billing"),
                new ManagementTool("tracking", "Live Tracking", "Monitor the real-time status of your open tickets.", "shield", "/maintenance")
        ));
        tenant = tenantRepository.save(tenant);

        try {
            User user = new User();
            user.setEmail(email);
            user.setPasswordHash(passwordEncoder.encode(password));
            user.setTenantId(tenant.getId());
            user.setRole("TENANT");
            userRepository.save(user);
            billingRepository.save(Billing.empty(tenant.getId()));

            NotificationDoc welcome = new NotificationDoc();
            welcome.setTenantId(tenant.getId());
            welcome.setCategory("Community");
            welcome.setTitle("Welcome to SiraNaBa, " + displayName(tenant) + "!");
            welcome.setBody(welcomeBody(tenant, due));
            welcome.setTimestamp(Instant.now());
            welcome.setCta(new Cta("Review my account", "/settings"));
            notificationRepository.save(welcome);
        } catch (RuntimeException ex) {
            // Don't leave a tenant with no login behind (e.g. duplicate-email race).
            removeTenantData(tenant.getId());
            if (ex instanceof org.springframework.dao.DuplicateKeyException) {
                throw new ApiException(HttpStatus.CONFLICT, "An account with this email already exists.");
            }
            throw ex;
        }

        EmailService.SendResult sent = emailService.sendWelcome(tenant, password);
        auditLogService.insert("TENANT", tenant.getTenantCode() + " — new tenant "
                + (tenant.getFirstName() + " " + tenant.getLastName()).trim()
                + " (Tower " + tenant.getTower() + ", Unit " + tenant.getUnit() + ")");
        return new RegisterTenantResponse(tenant.getId(), email, rent, tenant.getRentDueDate(), sent.sent(), sent.message());
    }

    private static String displayName(Tenant t) {
        return t.getFirstName() == null || t.getFirstName().isBlank() ? t.getLastName() : t.getFirstName();
    }

    private static String welcomeBody(Tenant t, LocalDate firstDue) {
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("MMMM d, yyyy", Locale.ENGLISH);
        String phone = t.getPhone() == null || t.getPhone().isBlank() ? "Not provided" : t.getPhone();
        return String.join("\n",
                "Your tenant portal is ready. Here is a summary of your registration.",
                "",
                "YOUR DETAILS",
                "Name: " + (t.getFirstName() + " " + t.getLastName()).trim(),
                "Tenant ID: " + t.getTenantCode(),
                "Email: " + t.getEmail(),
                "Phone: " + phone,
                "",
                "YOUR UNIT",
                "Tower " + t.getTower() + ", Unit " + t.getUnit() + " (" + t.getUnitType() + ")",
                "",
                "LEASE AGREEMENT",
                "Lease start: " + LocalDate.parse(t.getLeaseStart()).format(fmt),
                "Monthly rent: PHP " + String.format(Locale.ENGLISH, "%,.2f", t.getMonthlyRent()),
                "First rent due: " + firstDue.format(fmt) + " (then monthly on the same day)",
                "",
                "GETTING STARTED",
                "Pay rent and view invoices under Payments, report repairs under Maintenance, "
                        + "and please change your temporary password in Settings.");
    }

    /** Removes a tenant and their login so the unit can be assigned again. */
    public void remove(String tenantId) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant not found."));
        removeTenantData(tenantId);
        auditLogService.delete("TENANT", tenant.getTenantCode() + " — "
                + (tenant.getFirstName() + " " + tenant.getLastName()).trim() + " has been removed");
    }

    private void removeTenantData(String tenantId) {
        userRepository.deleteByTenantId(tenantId);
        billingRepository.deleteByTenantId(tenantId);
        notificationRepository.deleteByTenantId(tenantId);
        tenantRepository.deleteById(tenantId);
    }

    static String initialPassword(String fullName, int tower, String unit) {
        String[] parts = fullName.trim().split("\\s+");
        String initials = "" + Character.toUpperCase(parts[0].charAt(0))
                + (parts.length > 1 ? String.valueOf(Character.toUpperCase(parts[parts.length - 1].charAt(0))) : "");
        String unitPart = unit.replaceAll("[^A-Za-z0-9]", "").toUpperCase(Locale.ROOT);
        return initials + tower + unitPart;
    }
}