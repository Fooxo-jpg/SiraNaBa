package com.siranaba.backend.service;

import com.siranaba.backend.model.*;
import com.siranaba.backend.repository.TenantRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import java.time.*;
import java.util.Locale;

/** Sends each unpaid rent invoice once when it enters the configured notice window. */
@Service
public class RentInvoiceScheduler {
    private static final Logger LOG = LoggerFactory.getLogger(RentInvoiceScheduler.class);
    private static final ZoneId ZONE = ZoneId.of("Asia/Manila");
    private final MongoTemplate mongo;
    private final TenantRepository tenants;
    private final EmailService email;

    public RentInvoiceScheduler(MongoTemplate mongo, TenantRepository tenants, EmailService email) {
        this.mongo = mongo; this.tenants = tenants; this.email = email;
    }

    @Scheduled(cron = "${app.invoice-reminder-cron:0 0 * * * *}", zone = "Asia/Manila")
    public void dispatch() {
        DatabaseMaintenanceGate.runBackground(() -> dispatch(LocalDate.now(ZONE)));
    }

    void dispatch(LocalDate today) {
        MonthlyMaintenanceSettings settings = mongo.findById("monthly-maintenance", MonthlyMaintenanceSettings.class);
        int noticeDays = settings == null || settings.getInvoiceNoticeDays() == 0 ? 7 : settings.getInvoiceNoticeDays();
        LocalDate windowEnd = today.plusDays(noticeDays);
        try {
            for (Billing billing : mongo.find(Query.query(Criteria.where("archived").ne(true).and("reconciliationRequired").ne(true)), Billing.class)) {
                Tenant tenant = tenants.findById(billing.getTenantId()).orElse(null);
                if (tenant == null || tenant.getEmail() == null || tenant.getEmail().isBlank()) continue;
                for (Billing.RentObligation rent : billing.getRentObligations()) {
                    if (rent.getBalance().signum() <= 0 || rent.getDueDate() == null) continue;
                    LocalDate due;
                    try { due = LocalDate.parse(rent.getDueDate()); } catch (RuntimeException malformed) { continue; }
                    if (due.isBefore(today) || due.isAfter(windowEnd)) continue;
                    deliver(tenant, rent, noticeDays);
                }
            }
        } catch (RuntimeException ex) {
            LOG.warn("Rent invoice delivery will retry: {}", ex.getMessage());
        }
    }

    private void deliver(Tenant tenant, Billing.RentObligation rent, int noticeDays) {
        String deliveryId = "rent-invoice-" + rent.getId();
        RentInvoiceDelivery receipt = mongo.findById(deliveryId, RentInvoiceDelivery.class);
        if (receipt == null) {
            receipt = new RentInvoiceDelivery(); receipt.setId(deliveryId);
            receipt.setTenantId(tenant.getId()); receipt.setObligationId(rent.getId());
        }
        Instant now = Instant.now();
        if (!receipt.isNotificationSent()) {
            String amount = String.format(Locale.ENGLISH, "%,.2f", rent.getBalance());
            mongo.upsert(Query.query(Criteria.where("_id").is(deliveryId)), new Update()
                    .setOnInsert("tenantId", tenant.getId()).setOnInsert("category", "Payment")
                    .setOnInsert("title", "Rent invoice due soon")
                    .setOnInsert("body", "Your rent invoice for PHP " + amount + " is due on " + rent.getDueDate() + ".")
                    .setOnInsert("timestamp", now).setOnInsert("read", false)
                    .setOnInsert("cta", new Cta("View invoice", "/billing")), NotificationDoc.class);
            receipt.setNotificationSent(true); receipt.setNotificationSentAt(now); mongo.save(receipt);
        }
        if (!receipt.isEmailSent()) {
            EmailService.SendResult result = email.sendRentInvoice(tenant, rent, noticeDays);
            receipt.setLastEmailError(result.sent() ? null : result.message());
            if (result.sent()) { receipt.setEmailSent(true); receipt.setEmailSentAt(Instant.now()); }
            mongo.save(receipt);
        }
    }
}
