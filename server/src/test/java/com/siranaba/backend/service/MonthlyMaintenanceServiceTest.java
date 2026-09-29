package com.siranaba.backend.service;

import com.siranaba.backend.exception.ApiException;
import com.siranaba.backend.model.*;
import com.siranaba.backend.repository.TenantRepository;
import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.*;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MonthlyMaintenanceServiceTest {
    private final MongoTemplate mongo = mock(MongoTemplate.class);
    private final TenantRepository tenants = mock(TenantRepository.class);
    private final MonthlyMaintenanceService service = new MonthlyMaintenanceService(mongo, tenants);
    @Test void defaultIsTwentiethAndRollsIntoNextMonth() {
        var settings = new MonthlyMaintenanceSettings();
        assertEquals(LocalDate.of(2026, 9, 20), MonthlyMaintenanceService.nextDate(settings, LocalDate.of(2026, 9, 1)));
        assertEquals(LocalDate.of(2026, 9, 20), MonthlyMaintenanceService.nextDate(settings, LocalDate.of(2026, 9, 20)));
        assertEquals(LocalDate.of(2026, 10, 20), MonthlyMaintenanceService.nextDate(settings, LocalDate.of(2026, 9, 21)));
        assertEquals(20, service.get().dayOfMonth());
    }
    @Test void recurrenceHandlesShortMonthsLeapYearsAndExplicitFutureStart() {
        var settings = new MonthlyMaintenanceSettings(); settings.setDayOfMonth(31);
        assertEquals(LocalDate.of(2027, 2, 28), MonthlyMaintenanceService.nextDate(settings, LocalDate.of(2027, 2, 1)));
        assertEquals(LocalDate.of(2028, 2, 29), MonthlyMaintenanceService.nextDate(settings, LocalDate.of(2028, 2, 1)));
        settings.setEffectiveDate("2028-05-31");
        assertEquals(LocalDate.of(2028, 5, 31), MonthlyMaintenanceService.nextDate(settings, LocalDate.of(2028, 2, 1)));
    }
    @Test void unchangedDateDoesNotSendNotificationsOrSave() {
        var saved = service.update(service.get().nextDate());
        assertFalse(saved.changed()); assertEquals(0, saved.notifiedTenants());
        verifyNoInteractions(tenants);
        verify(mongo, never()).save(any(MonthlyMaintenanceSettings.class));
        verify(mongo, never()).upsert(any(Query.class), any(Update.class), eq(NotificationDoc.class));
    }
    @Test void changedScheduleNotifiesEveryTenantAndRetriesDoNotDuplicate() {
        var settings = new MonthlyMaintenanceSettings();
        when(mongo.findById("monthly-maintenance", MonthlyMaintenanceSettings.class)).thenReturn(settings);
        Tenant one = new Tenant(); one.setId("one"); Tenant two = new Tenant(); two.setId("two");
        when(tenants.findAll()).thenReturn(List.of(one, two));
        String newDate = LocalDate.parse(service.get().nextDate()).plusDays(1).toString();
        var saved = service.update(newDate);
        assertTrue(saved.changed()); assertEquals(2, saved.notifiedTenants());
        assertEquals(newDate, saved.schedule().nextDate());
        verify(mongo).save(settings);
        verify(mongo, times(2)).upsert(any(Query.class), argThat((Update u) -> u.getUpdateObject().containsKey("$setOnInsert")), eq(NotificationDoc.class));
        assertEquals(0, service.update(newDate).notifiedTenants());
        verify(mongo, times(2)).upsert(any(Query.class), any(Update.class), eq(NotificationDoc.class));
    }
    @Test void failedNotificationRemainsPendingForRetryWithStableId() {
        var settings = new MonthlyMaintenanceSettings();
        when(mongo.findById("monthly-maintenance", MonthlyMaintenanceSettings.class)).thenReturn(settings);
        Tenant tenant = new Tenant(); tenant.setId("one"); when(tenants.findAll()).thenReturn(List.of(tenant));
        when(mongo.upsert(any(Query.class), any(Update.class), eq(NotificationDoc.class))).thenThrow(new RuntimeException("offline")).thenReturn(null);
        String date = LocalDate.parse(service.get().nextDate()).plusDays(1).toString();
        assertThrows(ApiException.class, () -> service.update(date));
        String revision = settings.getRevision();
        assertEquals(1, service.get().pendingNotifications());
        assertEquals(1, service.update(date).notifiedTenants());
        assertEquals(revision, settings.getRevision());
        assertEquals(0, service.get().pendingNotifications());
    }
    @Test void pastOrMalformedDatesAreRejected() {
        assertThrows(ApiException.class, () -> service.update("not-a-date"));
        assertThrows(ApiException.class, () -> service.update(LocalDate.now(ZoneId.of("Asia/Manila")).minusDays(1).toString()));
        verifyNoInteractions(tenants);
    }
    @Test void invoiceNoticeMustStayBetweenThreeDaysAndTwoWeeks() {
        String date = service.get().nextDate();
        assertThrows(ApiException.class, () -> service.update(date, 2));
        assertThrows(ApiException.class, () -> service.update(date, 15));
        assertEquals(3, service.update(date, 3).schedule().invoiceNoticeDays());
        assertEquals(14, service.update(date, 14).schedule().invoiceNoticeDays());
    }
}
