package com.siranaba.backend.service;

import com.siranaba.backend.model.*;
import com.siranaba.backend.repository.TenantRepository;
import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class RentInvoiceSchedulerTest {
    private final MongoTemplate mongo = mock(MongoTemplate.class);
    private final TenantRepository tenants = mock(TenantRepository.class);
    private final EmailService email = mock(EmailService.class);
    private final RentInvoiceScheduler scheduler = new RentInvoiceScheduler(mongo, tenants, email);

    @Test void sendsNotificationAndEmailOnceInsideConfiguredWindow() {
        LocalDate today = LocalDate.of(2026, 9, 28);
        MonthlyMaintenanceSettings settings = new MonthlyMaintenanceSettings(); settings.setInvoiceNoticeDays(7);
        Tenant tenant = new Tenant(); tenant.setId("tenant-1"); tenant.setFirstName("Ari"); tenant.setEmail("ari@example.test");
        Billing billing = Billing.empty(tenant.getId()); billing.setId("billing-1");
        Billing.RentObligation rent = new Billing.RentObligation(); rent.setId("rent-1"); rent.setBillingPeriod("2026-10");
        rent.setAmount(new BigDecimal("5000")); rent.setPaid(BigDecimal.ZERO); rent.setDueDate(today.plusDays(7).toString());
        billing.getRentObligations().add(rent);
        when(mongo.findById("monthly-maintenance", MonthlyMaintenanceSettings.class)).thenReturn(settings);
        when(mongo.find(any(Query.class), eq(Billing.class))).thenReturn(List.of(billing));
        when(tenants.findById(tenant.getId())).thenReturn(Optional.of(tenant));
        when(email.sendRentInvoice(tenant, rent, 7)).thenReturn(new EmailService.SendResult(true, "sent"));

        scheduler.dispatch(today);

        verify(mongo).upsert(any(Query.class), any(Update.class), eq(NotificationDoc.class));
        verify(email).sendRentInvoice(tenant, rent, 7);
        verify(mongo, atLeastOnce()).save(argThat((RentInvoiceDelivery d) -> d.isNotificationSent() && d.isEmailSent()));
    }

    @Test void skipsPaidOverdueAndInvoicesOutsideNoticeWindow() {
        LocalDate today = LocalDate.of(2026, 9, 28);
        Tenant tenant = new Tenant(); tenant.setId("tenant-1"); tenant.setEmail("ari@example.test");
        Billing billing = Billing.empty(tenant.getId()); billing.setId("billing-1");
        billing.getRentObligations().add(rent("paid", today.plusDays(2), "100", "100"));
        billing.getRentObligations().add(rent("overdue", today.minusDays(1), "100", "0"));
        billing.getRentObligations().add(rent("future", today.plusDays(8), "100", "0"));
        when(mongo.find(any(Query.class), eq(Billing.class))).thenReturn(List.of(billing));
        when(tenants.findById(tenant.getId())).thenReturn(Optional.of(tenant));

        scheduler.dispatch(today);

        verifyNoInteractions(email);
        verify(mongo, never()).upsert(any(Query.class), any(Update.class), eq(NotificationDoc.class));
    }

    private static Billing.RentObligation rent(String id, LocalDate due, String amount, String paid) {
        Billing.RentObligation rent = new Billing.RentObligation(); rent.setId(id); rent.setDueDate(due.toString());
        rent.setAmount(new BigDecimal(amount)); rent.setPaid(new BigDecimal(paid)); return rent;
    }
}
