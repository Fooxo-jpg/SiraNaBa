package com.siranaba.backend.bootstrap;

import com.siranaba.backend.config.AppProperties;
import com.siranaba.backend.model.ActivityItem;
import com.siranaba.backend.model.Billing;
import com.siranaba.backend.model.Cta;
import com.siranaba.backend.model.ManagementTool;
import com.siranaba.backend.model.NotificationDoc;
import com.siranaba.backend.model.ScheduledMaintenance;
import com.siranaba.backend.model.Tenant;
import com.siranaba.backend.model.User;
import com.siranaba.backend.model.UtilityUsage;
import com.siranaba.backend.repository.BillingRepository;
import com.siranaba.backend.repository.NotificationRepository;
import com.siranaba.backend.repository.TenantRepository;
import com.siranaba.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Seeds one demo tenant (+ login user, billing record, and a few
 * notifications) on first run so the app isn't blank out of the box - the
 * same role src/data/mockDb.js used to play. Only runs when the tenants
 * collection is empty, so it never overwrites real data, and can be turned
 * off entirely with SEED_DEMO_DATA=false.
 */
@Component
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final BillingRepository billingRepository;
    private final NotificationRepository notificationRepository;
    private final PasswordEncoder passwordEncoder;
    private final AppProperties appProperties;

    public DataSeeder(TenantRepository tenantRepository, UserRepository userRepository,
                       BillingRepository billingRepository, NotificationRepository notificationRepository,
                       PasswordEncoder passwordEncoder, AppProperties appProperties) {
        this.tenantRepository = tenantRepository;
        this.userRepository = userRepository;
        this.billingRepository = billingRepository;
        this.notificationRepository = notificationRepository;
        this.passwordEncoder = passwordEncoder;
        this.appProperties = appProperties;
    }

    @Override
    public void run(String... args) {
        if (!appProperties.getSeed().isEnabled()) {
            return;
        }
        // An empty database with retained admins is an intentional clean state.
        // Do not seed demo records or alter existing admin credentials after cleanup.
        if (tenantRepository.count() == 0 && userRepository.existsByRole("ADMIN")) return;
        if (tenantRepository.count() == 0) {
            seedDemoTenant();
        }
        ensureAdminAndTenantLogins();

    }

    /**
     * Runs on every start. Makes sure the admin account exists with the ADMIN
     * role (promoting it if an earlier run created it as a tenant login), and
     * that the demo tenant still has its own tenant login.
     */
    private void ensureAdminAndTenantLogins() {
        String adminEmail = appProperties.getSeed().getAdminEmail();
        User admin = userRepository.findByEmailIgnoreCase(adminEmail).orElseGet(() -> {
            User u = new User();
            u.setEmail(adminEmail);
            u.setPasswordHash(passwordEncoder.encode(appProperties.getSeed().getAdminPassword()));
            return u;
        });
        if (!"ADMIN".equals(admin.getRole()) || admin.getTenantId() != null) {
            admin.setRole("ADMIN");
            admin.setTenantId(null);
            userRepository.save(admin);
            log.info("Admin login ready -> email: {}", adminEmail);
        }

        String demoEmail = appProperties.getSeed().getDemoEmail();
        if (demoEmail.equalsIgnoreCase(adminEmail)) {
            return;
        }
        tenantRepository.findAll().stream().findFirst().ifPresent(tenant -> {
            if (!userRepository.existsByTenantId(tenant.getId())
                    && userRepository.findByEmailIgnoreCase(demoEmail).isEmpty()) {
                User u = new User();
                u.setEmail(demoEmail);
                u.setPasswordHash(passwordEncoder.encode(appProperties.getSeed().getDemoPassword()));
                u.setTenantId(tenant.getId());
                u.setRole("TENANT");
                userRepository.save(u);
                log.info("Tenant login ready -> email: {}", demoEmail);
            }
        });
    }

    private void seedDemoTenant() {
        log.info("No tenant data found - seeding demo tenant, login, billing and notifications.");

        Tenant tenant = new Tenant();
        tenant.setFirstName("Alex");
        tenant.setLastName("Rivers");
        tenant.setUnit("402");
        tenant.setBuilding("Building A");
        tenant.setRentDueDate("2024-11-01");

        tenant.setAutoPayEnabled(false);
        tenant.setDaysUntilRentDue(12);
        tenant.setUtilityUsage(new UtilityUsage(
                "Current billing cycle",
                new UtilityUsage.UsageMetric(380, 500, "kWh", -12),
                new UtilityUsage.UsageMetric(1120, 2000, "Gal", null)
        ));
        tenant.setManagementTools(List.of(
                new ManagementTool("maintenance", "Maintenance", "Report leaks, electrical issues, or structural repairs.", "wrench", "/maintenance"),
                new ManagementTool("billing", "Billing Center", "View utility breakdowns and download past invoices.", "history", "/billing"),
                new ManagementTool("tracking", "Live Tracking", "Monitor the real-time status of your open tickets.", "shield", "/maintenance")
        ));
        Instant now = Instant.now();
        tenant.setRecentActivity(List.of(
                new ActivityItem("act_2", "System Security Update", now.minus(2, ChronoUnit.DAYS), "Applied")
        ));
        tenant.setNextScheduledMaintenance(new ScheduledMaintenance("Quarterly HVAC Check", "2024-10-28"));
        Tenant.ServiceHealth serviceHealth = new Tenant.ServiceHealth();
        serviceHealth.setAverageResponseHours(3.5);
        serviceHealth.setResolutionRate(94);
        tenant.setServiceHealth(serviceHealth);

        tenant = tenantRepository.save(tenant);

        // Billing starts empty - no fake balance, card or transactions.
        billingRepository.save(com.siranaba.backend.service.BillingLedgerService.initial(tenant));

        NotificationDoc n1 = new NotificationDoc();
        n1.setTenantId(tenant.getId());
        n1.setCategory("Maintenance");
        n1.setTitle("Welcome to SiraNaBa");
        n1.setBody("Your tenant portal is ready. Submit a request any time from the Maintenance tab.");
        n1.setTimestamp(now.minus(1, ChronoUnit.DAYS));
        n1.setCta(new Cta("Go to Maintenance", "/maintenance"));
        n1.setRead(false);
        notificationRepository.save(n1);

        log.info("Demo tenant seeded.");
    }
}
