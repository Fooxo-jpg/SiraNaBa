package com.siranaba.backend.service;

import com.siranaba.backend.exception.ApiException;
import com.siranaba.backend.model.*;
import com.siranaba.backend.repository.TenantRepository;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class MonthlyMaintenanceService {
    private final MongoTemplate mongo;
    private final TenantRepository tenants;
    public MonthlyMaintenanceService(MongoTemplate mongo, TenantRepository tenants) {
        this.mongo = mongo; this.tenants = tenants;
    }
    public record Schedule(int dayOfMonth, String nextDate, int pendingNotifications, int invoiceNoticeDays) {}
    public record Saved(Schedule schedule, boolean changed, int notifiedTenants) {}
    private LocalDate today() { return LocalDate.now(ZoneId.of("Asia/Manila")); }
    private MonthlyMaintenanceSettings settings() {
        var settings = mongo.findById("monthly-maintenance", MonthlyMaintenanceSettings.class);
        return settings == null ? new MonthlyMaintenanceSettings() : settings;
    }
    public synchronized Schedule get() { return view(settings(), today()); }
    static Schedule view(MonthlyMaintenanceSettings settings, LocalDate today) {
        int noticeDays = settings.getInvoiceNoticeDays() == 0 ? 7 : settings.getInvoiceNoticeDays();
        return new Schedule(settings.getDayOfMonth(), nextDate(settings, today).toString(), settings.getPendingTenantIds().size(), noticeDays);
    }
    static LocalDate nextDate(MonthlyMaintenanceSettings settings, LocalDate today) {
        LocalDate start = settings.getEffectiveDate() == null ? today : LocalDate.parse(settings.getEffectiveDate());
        LocalDate threshold = start.isAfter(today) ? start : today;
        YearMonth month = YearMonth.from(threshold);
        LocalDate candidate = month.atDay(Math.min(settings.getDayOfMonth(), month.lengthOfMonth()));
        if (candidate.isBefore(threshold)) {
            month = month.plusMonths(1);
            candidate = month.atDay(Math.min(settings.getDayOfMonth(), month.lengthOfMonth()));
        }
        return candidate;
    }
    public synchronized Saved update(String date) {
        return update(date, null);
    }
    public synchronized Saved update(String date, Integer invoiceNoticeDays) {
        LocalDate selected;
        try { selected = LocalDate.parse(date); }
        catch (RuntimeException error) { throw new ApiException(HttpStatus.BAD_REQUEST, "Choose a valid maintenance date."); }
        LocalDate today = today();
        if (selected.isBefore(today)) throw new ApiException(HttpStatus.BAD_REQUEST, "Choose today or a future date.");
        MonthlyMaintenanceSettings settings = settings();
        int requestedNoticeDays = invoiceNoticeDays == null
                ? (settings.getInvoiceNoticeDays() == 0 ? 7 : settings.getInvoiceNoticeDays())
                : invoiceNoticeDays;
        if (requestedNoticeDays < 3 || requestedNoticeDays > 14)
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invoice notice must be between 3 and 14 days.");
        int notified = deliverPending(settings);
        boolean scheduleChanged = !selected.equals(nextDate(settings, today));
        boolean noticeChanged = settings.getInvoiceNoticeDays() != requestedNoticeDays;
        if (scheduleChanged) {
            settings.setDayOfMonth(selected.getDayOfMonth());
            settings.setEffectiveDate(selected.toString());
            settings.setRevision(UUID.randomUUID().toString());
            settings.setChangedAt(Instant.now());
            settings.setPendingTenantIds(new ArrayList<>(tenants.findAll().stream().map(Tenant::getId).toList()));
        }
        settings.setInvoiceNoticeDays(requestedNoticeDays);
        if (scheduleChanged || noticeChanged) mongo.save(settings);
        if (scheduleChanged) notified += deliverPending(settings);
        return new Saved(view(settings, today), scheduleChanged || noticeChanged, notified);
    }
    private int deliverPending(MonthlyMaintenanceSettings settings) {
        int delivered = 0;
        try {
            for (String tenantId : new ArrayList<>(settings.getPendingTenantIds())) {
                String id = "maintenance-" + settings.getRevision() + "-" + tenantId;
                String date = LocalDate.parse(settings.getEffectiveDate()).format(DateTimeFormatter.ofPattern("MMMM d, uuuu", Locale.ENGLISH));
                String body = "The new monthly maintenance date is scheduled for " + date
                        + ". Maintenance will recur on day " + settings.getDayOfMonth()
                        + " of each month (the last day in shorter months).";
                // Stable ids and insert-only fields make retries safe without duplicating or marking read alerts unread.
                mongo.upsert(Query.query(Criteria.where("_id").is(id)), new Update()
                        .setOnInsert("tenantId", tenantId).setOnInsert("category", "Maintenance")
                        .setOnInsert("title", "Monthly maintenance rescheduled").setOnInsert("body", body)
                        .setOnInsert("timestamp", settings.getChangedAt()).setOnInsert("read", false)
                        .setOnInsert("cta", new Cta("View schedule", "/")), NotificationDoc.class);
                mongo.updateFirst(Query.query(Criteria.where("_id").is(settings.getId())),
                        new Update().pull("pendingTenantIds", tenantId), MonthlyMaintenanceSettings.class);
                settings.getPendingTenantIds().remove(tenantId);
                delivered++;
            }
        } catch (RuntimeException failure) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                    "The schedule is saved, but some tenant notifications are pending. Save again to retry without duplicate alerts.");
        }
        return delivered;
    }
}
