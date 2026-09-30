package com.siranaba.backend.service;

import com.siranaba.backend.exception.ApiException;
import com.siranaba.backend.model.*;
import com.siranaba.backend.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.*;
import java.util.*;

@Service
public class TestDataService {
    private static final String TEST_PASSWORD = "Test123!";
    private static final String[] FIRST = {"Avery", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Jamie", "Cameron", "Quinn", "Skyler"};
    private static final String[] LAST = {"Santos", "Reyes", "Cruz", "Garcia", "Mendoza", "Flores", "Torres", "Ramos", "Navarro", "Aquino"};
    private static final String[] SPECIALTIES = {"Electrician", "Plumber", "HVAC Specialist", "General Repair", "Cleaner"};
    private static final String[][] ISSUES = {
            {"Plumbing", "Leaking kitchen pipe"}, {"Electrical", "Intermittent power outlet"},
            {"Structural", "Crack near window frame"}, {"Fire Safety", "Smoke detector inspection"},
            {"General", "Door lock needs adjustment"}
    };
    private static final String[] SEVERITIES = {"Low", "Medium", "High", "Severe", "Critical"};

    private final TenantRepository tenants; private final UserRepository users; private final BillingRepository billing;
    private final NotificationRepository notifications; private final StaffRepository staff; private final TicketRepository tickets;
    private final PasswordEncoder passwords; private final TenantCodeService tenantCodes;

    public TestDataService(TenantRepository tenants, UserRepository users, BillingRepository billing,
                           NotificationRepository notifications, StaffRepository staff, TicketRepository tickets,
                           PasswordEncoder passwords, TenantCodeService tenantCodes) {
        this.tenants = tenants; this.users = users; this.billing = billing; this.notifications = notifications;
        this.staff = staff; this.tickets = tickets; this.passwords = passwords; this.tenantCodes = tenantCodes;
    }

    public record Request(int tenantCount, int staffCount, boolean createTickets, int minTicketsPerTenant,
                          int maxTicketsPerTenant, String severity, boolean randomTicketProgress,
                          boolean createNotifications, boolean replaceGeneratedData,
                          boolean randomizeAccountStatus, boolean randomizeRoomAllocation) {}
    public record Account(String name, String email, String unit) {}
    public record Result(int tenantsCreated, int staffCreated, int ticketsCreated, int notificationsCreated,
                         String sharedPassword, List<Account> sampleAccounts, int removedGeneratedRecords) {}

    public synchronized Result generate(Request request) {
        validate(request);
        int removed = request.replaceGeneratedData() ? removeGenerated() : 0;
        Set<String> occupied = new HashSet<>();
        tenants.findAll().forEach(t -> occupied.add(t.getRoomId()));
        List<BuildingCatalog.Room> rooms = new ArrayList<>();
        for (int floor = 2; floor <= 12; floor++) for (int room = 1; room <= 10; room++) {
            String id = "T1-" + String.format("%02d", floor) + "-" + String.format("%02d", room);
            if (!occupied.contains(id)) rooms.add(BuildingCatalog.requireRoomId(id));
        }
        if (request.tenantCount() > rooms.size())
            throw new ApiException(HttpStatus.CONFLICT, "Only " + rooms.size() + " vacant units are available for test tenants.");

        Random random = new Random();
        if (request.randomizeRoomAllocation()) Collections.shuffle(rooms, random);
        String run = Long.toString(System.currentTimeMillis(), 36);
        List<Tenant> createdTenants = new ArrayList<>();
        List<Account> accounts = new ArrayList<>();
        int notificationCount = 0, ticketCount = 0;
        List<Staff> generatedStaff = new ArrayList<>();
        int nextStaffCode = staff.findAll().stream().map(Staff::getStaffCode).filter(Objects::nonNull)
                .filter(code -> code.matches("ST-\\d+")).mapToInt(code -> Integer.parseInt(code.substring(3))).max().orElse(200) + 1;
        for (int i = 0; i < request.staffCount(); i++) {
            Staff member = new Staff(); member.setStaffCode("ST-" + (nextStaffCode + i)); member.setName(FIRST[i % FIRST.length] + " " + LAST[(i + 3) % LAST.length]);
            member.setSpecialty(SPECIALTIES[i % SPECIALTIES.length]); member.setAvailability(i % 3 == 0 ? "offline" : "online");
            member.setWorkload(0); member.setTickets(0); member.setEmail("dummy.staff." + run + "." + (i + 1) + "@example.test");
            member.setPhone("+63 910 000 " + String.format("%04d", i + 1)); member.setGeneratedTestData(true);
            generatedStaff.add(staff.save(member));
        }
        for (int i = 0; i < request.tenantCount(); i++) {
            BuildingCatalog.Room room = rooms.get(i);
            String first = FIRST[(i + random.nextInt(FIRST.length)) % FIRST.length];
            String last = LAST[(i + random.nextInt(LAST.length)) % LAST.length];
            Tenant tenant = new Tenant();
            tenant.setTenantCode(tenantCodes.nextCode()); tenant.setFirstName(first); tenant.setLastName(last);
            tenant.setEmail("dummy." + run + "." + (i + 1) + "@example.test"); tenant.setPhone("+63 900 000 " + String.format("%04d", i + 1));
            tenant.setRoomId(room.id()); tenant.setTower(1); tenant.setUnit(room.unit()); tenant.setUnitType(room.type());
            tenant.setBuilding("Main Building"); tenant.setMonthlyRent(UnitPricing.monthlyRent(room.type()));
            int accountState = request.randomizeAccountStatus() ? i % 4 : 0;
            LocalDate leaseStart = accountState == 1 ? LocalDate.now().plusDays(7 + random.nextInt(45)) : LocalDate.now().minusMonths(random.nextInt(18));
            tenant.setLeaseStart(leaseStart.toString());
            tenant.setRentDueDate(LocalDate.now().plusMonths(1).toString()); tenant.setGeneratedTestData(true);
            tenant = tenants.save(tenant); createdTenants.add(tenant);
            User user = new User(); user.setEmail(tenant.getEmail()); user.setPasswordHash(passwords.encode(TEST_PASSWORD));
            user.setTenantId(tenant.getId()); user.setRole("TENANT"); user.setGeneratedTestData(true); users.save(user);
            Billing tenantBilling = BillingLedgerService.initial(tenant);
            if (accountState == 2 || accountState == 3) {
                LocalDate due = accountState == 2 ? LocalDate.now().plusDays(10) : LocalDate.now().minusDays(10);
                tenantBilling.getRentObligations().add(BillingAccounting.rent(YearMonth.now().toString(), due.toString(),
                        java.math.BigDecimal.valueOf(tenant.getMonthlyRent()), java.math.BigDecimal.ZERO));
            }
            billing.save(tenantBilling);
            accounts.add(new Account(first + " " + last, tenant.getEmail(), tenant.getUnit()));
            if (request.createNotifications()) {
                NotificationDoc note = new NotificationDoc(); note.setTenantId(tenant.getId()); note.setCategory("Community");
                note.setTitle("Test account ready"); note.setBody("This notification was generated by the System Configuration testing tool.");
                note.setTimestamp(Instant.now()); note.setCta(new Cta("Open dashboard", "/")); notifications.save(note); notificationCount++;
            }
            if (request.createTickets()) {
                int count = request.minTicketsPerTenant() + random.nextInt(request.maxTicketsPerTenant() - request.minTicketsPerTenant() + 1);
                for (int n = 0; n < count; n++) { tickets.save(ticket(tenant, request, random, run, i, n, generatedStaff)); ticketCount++; }
            }
        }
        generatedStaff.forEach(staff::save);
        return new Result(createdTenants.size(), request.staffCount(), ticketCount, notificationCount,
                TEST_PASSWORD, accounts.stream().limit(8).toList(), removed);
    }

    private Ticket ticket(Tenant tenant, Request request, Random random, String run, int tenantIndex, int index, List<Staff> generatedStaff) {
        String[] issue = ISSUES[random.nextInt(ISSUES.length)]; Instant submitted = Instant.now().minus(Duration.ofHours(random.nextInt(24 * 45)));
        Ticket ticket = new Ticket(); ticket.setId("TST-" + run.toUpperCase(Locale.ROOT) + "-" + tenantIndex + "-" + index);
        ticket.setTenantId(tenant.getId()); ticket.setCategory(issue[0]); ticket.setTitle(issue[1]);
        ticket.setDescription("Generated test request for " + issue[1].toLowerCase(Locale.ROOT) + ".");
        ticket.setLocation("Main Building, Unit " + tenant.getUnit()); ticket.setTower(1); ticket.setUnit(tenant.getUnit()); ticket.setIssueType(issue[1]);
        ticket.setPriority("Mixed".equals(request.severity()) ? SEVERITIES[random.nextInt(SEVERITIES.length)] : request.severity());
        ticket.setStage("Submitted"); ticket.setDispatchStatus("Assigned");
        ticket.setSubmittedAt(submitted); ticket.setUpdatedAt(submitted.plus(Duration.ofHours(random.nextInt(24))));
        List<TimelineEvent> timeline = new ArrayList<>();
        timeline.add(new TimelineEvent("test-" + UUID.randomUUID(), "Test ticket generated", "Created by System Configuration.", submitted));
        ticket.setSpecialist(Specialist.unassigned());
        if (request.randomTicketProgress() && !generatedStaff.isEmpty()) {
            int progress = random.nextInt(4);
            if (progress > 0) {
                Staff assigned = generatedStaff.get(random.nextInt(generatedStaff.size()));
                ticket.setAssignedStaffId(assigned.getId());
                ticket.setSpecialist(new Specialist(assigned.getName(), assigned.getSpecialty(), 4.8, 20, progress == 1 ? "Coordinating" : null, progress == 3 ? "Completed" : "Assigned", assigned.getPhone()));
                timeline.add(new TimelineEvent("test-" + UUID.randomUUID(), "Staff assigned", assigned.getName() + " was assigned to this request.", submitted.plus(Duration.ofHours(1))));
                if (progress == 1) {
                    ticket.setStage("Assigned"); ticket.setDispatchStatus("Coordinating");
                    assigned.setTickets(assigned.getTickets() + 1); assigned.setWorkload(Math.min(100, assigned.getWorkload() + 15));
                } else if (progress == 2) {
                    ticket.setStage("In Progress"); ticket.setDispatchStatus("Dispatched");
                    assigned.setTickets(assigned.getTickets() + 1); assigned.setWorkload(Math.min(100, assigned.getWorkload() + 20));
                    timeline.add(new TimelineEvent("test-" + UUID.randomUUID(), "Work in progress", "Maintenance staff arrived and began work.", submitted.plus(Duration.ofHours(2))));
                } else {
                    ticket.setStage("Resolved"); ticket.setDispatchStatus("Fixed Problem");
                    ticket.setUpdatedAt(submitted.plus(Duration.ofHours(4)));
                    timeline.add(new TimelineEvent("test-" + UUID.randomUUID(), "Fixed Problem", "The generated maintenance request was completed.", ticket.getUpdatedAt()));
                }
            }
        }
        ticket.setTimeline(timeline);
        ticket.setGeneratedTestData(true); return ticket;
    }

    private int removeGenerated() {
        int removed = 0;
        for (Ticket item : tickets.findByGeneratedTestDataTrue()) { tickets.deleteById(item.getId()); removed++; }
        for (Staff item : staff.findByGeneratedTestDataTrue()) { staff.deleteById(item.getId()); removed++; }
        for (Tenant tenant : tenants.findByGeneratedTestDataTrue()) {
            users.deleteByTenantId(tenant.getId()); billing.deleteByTenantId(tenant.getId()); notifications.deleteByTenantId(tenant.getId()); tenants.deleteById(tenant.getId()); removed++;
        }
        return removed;
    }

    private static void validate(Request r) {
        if (r.tenantCount() < 0 || r.tenantCount() > 100 || r.staffCount() < 0 || r.staffCount() > 50)
            throw new ApiException(HttpStatus.BAD_REQUEST, "Generate 0-100 tenants and 0-50 staff members at a time.");
        if (r.tenantCount() == 0 && r.staffCount() == 0) throw new ApiException(HttpStatus.BAD_REQUEST, "Choose at least one tenant or staff member.");
        if (r.createTickets() && (r.minTicketsPerTenant() < 0 || r.maxTicketsPerTenant() > 20 || r.minTicketsPerTenant() > r.maxTicketsPerTenant()))
            throw new ApiException(HttpStatus.BAD_REQUEST, "Ticket range must be between 0 and 20, with minimum no greater than maximum.");
        if (!List.of("Mixed", "Low", "Medium", "High", "Severe", "Critical").contains(r.severity()))
            throw new ApiException(HttpStatus.BAD_REQUEST, "Choose a valid ticket severity.");
    }
}
