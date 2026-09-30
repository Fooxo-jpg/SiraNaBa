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
import java.security.SecureRandom;

@Service
public class TenantRegistrationService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final char[] PASSWORD_CHARS = "0123456789abcdefghijklmnopqrstuvwxyz".toCharArray();

    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final BillingRepository billingRepository;
    private final NotificationRepository notificationRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final WelcomeEmailDispatcher welcomeEmailDispatcher;
    private final TenantCodeService tenantCodeService;
    private final AuditLogService auditLogService;
    private final BillingLedgerService ledger;
    private final FacilityMaintenanceScheduleRepository maintenanceSchedules;

    public TenantRegistrationService(TenantRepository tenantRepository, UserRepository userRepository,
                                     BillingRepository billingRepository, NotificationRepository notificationRepository,
                                     PasswordEncoder passwordEncoder, EmailService emailService,
                                     WelcomeEmailDispatcher welcomeEmailDispatcher, TenantCodeService tenantCodeService,
                                     AuditLogService auditLogService, BillingLedgerService ledger,
                                     FacilityMaintenanceScheduleRepository maintenanceSchedules) {
        this.tenantRepository = tenantRepository;
        this.userRepository = userRepository;
        this.billingRepository = billingRepository;
        this.notificationRepository = notificationRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.welcomeEmailDispatcher = welcomeEmailDispatcher;
        this.tenantCodeService = tenantCodeService;
        this.auditLogService = auditLogService;
        this.ledger = ledger;
        this.maintenanceSchedules = maintenanceSchedules;
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
        BuildingCatalog.Room room = BuildingCatalog.requireRoomId(req.roomId());
        double rent = UnitPricing.monthlyRent(room.type());

        if (userRepository.findByEmailIgnoreCase(email).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "An account with this email already exists.");
        }
        if (tenantRepository.existsByRoomId(req.roomId())) {
            throw new ApiException(HttpStatus.CONFLICT, "This unit is already assigned to another tenant.");
        }

        String password = initialPassword(fullName, room.unit());
        LocalDate due = leaseStart.plusMonths(1);
        long daysUntilDue = Math.max(0, ChronoUnit.DAYS.between(LocalDate.now(), due));

        String[] parts = fullName.split(" ");
        Tenant tenant = new Tenant();
        tenant.setTenantCode(tenantCodeService.nextCode());
        tenant.setLastName(parts[parts.length - 1]);
        tenant.setFirstName(parts.length > 1 ? fullName.substring(0, fullName.length() - tenant.getLastName().length()).trim() : "");
        tenant.setEmail(email);
        tenant.setPhone(req.phone() == null ? null : req.phone().trim());
        tenant.setRoomId(room.id());
        tenant.setTower(room.building());
        tenant.setUnit(room.unit());
        tenant.setUnitType(room.type());
        tenant.setBuilding("Main Building");
        tenant.setMonthlyRent(rent);
        tenant.setLeaseStart(leaseStart.toString());
        tenant.setRentDueDate(due.toString());
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
            user.setMustChangePassword(true);
            userRepository.save(user);
            billingRepository.save(BillingLedgerService.initial(tenant));

            NotificationDoc welcome = new NotificationDoc();
            welcome.setTenantId(tenant.getId());
            welcome.setCategory("Community");
            welcome.setTitle("Welcome to SiraNaBa, " + displayName(tenant) + "!");
            welcome.setBody(welcomeBody(tenant, due));
            welcome.setTimestamp(Instant.now());
            welcome.setCta(new Cta("Review my account", "/settings"));
            notificationRepository.save(welcome);

            Tenant registeredTenant = tenant;
            maintenanceSchedules.findByStatusAndScheduledAtAfterOrderByScheduledAtAsc("Scheduled", Instant.now()).stream()
                    .filter(schedule -> schedule.getAffectedRoomIds().contains(registeredTenant.getRoomId()))
                    .forEach(schedule -> {
                        NotificationDoc notice = new NotificationDoc();
                        notice.setId("facility-maintenance-" + schedule.getId() + "-" + registeredTenant.getId());
                        notice.setTenantId(registeredTenant.getId());
                        notice.setCategory("Maintenance");
                        notice.setTitle("Upcoming maintenance for your unit");
                        notice.setBody("Maintenance is scheduled for " + schedule.getScheduledAt()
                                + ". Reason: " + schedule.getReason());
                        notice.setTimestamp(Instant.now());
                        notice.setCta(new Cta("View maintenance calendar", "/maintenance"));
                        notice.setRead(false);
                        notificationRepository.save(notice);
                    });
        } catch (RuntimeException ex) {
            // Don't leave a tenant with no login behind (e.g. duplicate-email race).
            removeTenantData(tenant.getId());
            if (ex instanceof org.springframework.dao.DuplicateKeyException) {
                throw new ApiException(HttpStatus.CONFLICT, "An account with this email already exists.");
            }
            throw ex;
        }

        boolean emailQueued = emailService.isConfigured();
        if (emailQueued) welcomeEmailDispatcher.send(tenant, password);
        auditLogService.insert("TENANT", tenant.getTenantCode() + " — new tenant "
                + (tenant.getFirstName() + " " + tenant.getLastName()).trim()
                + " (Main Building, Unit " + tenant.getUnit() + ")");
        String emailMessage = emailQueued
                ? "The welcome email has been queued for delivery."
                : "Email is not configured on the server; the account and room assignment were still created.";
        return new RegisterTenantResponse(tenant.getId(), email, rent, tenant.getRentDueDate(), false, emailQueued, emailMessage);
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
                "Main Building, Unit " + t.getUnit() + " (" + t.getUnitType() + ")",
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
        // Account removal must not erase the financial audit trail.
        ledger.mutate(tenantId, b -> {
            b.setArchived(true);
            b.setTenantSnapshot(new Billing.TenantSnapshot(tenant.getTenantCode(), tenant.getFirstName(), tenant.getLastName(), tenant.getUnit(), tenant.getBuilding()));
            return b;
        });
        userRepository.deleteByTenantId(tenantId);
        notificationRepository.deleteByTenantId(tenantId);
        tenantRepository.deleteById(tenantId);
        auditLogService.delete("TENANT", tenant.getTenantCode() + " — "
                + (tenant.getFirstName() + " " + tenant.getLastName()).trim() + " has been removed");
    }

    private void removeTenantData(String tenantId) {
        userRepository.deleteByTenantId(tenantId);
        billingRepository.deleteByTenantId(tenantId);
        notificationRepository.deleteByTenantId(tenantId);
        tenantRepository.deleteById(tenantId);
    }

    static String initialPassword(String fullName, String unit) {
        StringBuilder password = new StringBuilder();
        for (int i = 0; i < 4; i++) password.append(PASSWORD_CHARS[RANDOM.nextInt(PASSWORD_CHARS.length)]);
        for (String part : fullName.trim().split("\\s+")) password.append(Character.toUpperCase(part.charAt(0)));
        return password.append(unit.replaceAll("[^A-Za-z0-9]", "").toUpperCase(Locale.ROOT)).toString();
    }
}
