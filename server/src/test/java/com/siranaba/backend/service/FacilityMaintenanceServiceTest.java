package com.siranaba.backend.service;

import com.siranaba.backend.dto.CreateFacilityMaintenanceRequest;
import com.siranaba.backend.exception.ApiException;
import com.siranaba.backend.model.FacilityMaintenanceSchedule;
import com.siranaba.backend.model.Tenant;
import com.siranaba.backend.repository.FacilityMaintenanceScheduleRepository;
import com.siranaba.backend.repository.NotificationRepository;
import com.siranaba.backend.repository.TenantRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.*;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class FacilityMaintenanceServiceTest {
    private FacilityMaintenanceScheduleRepository schedules;
    private TenantRepository tenants;
    private NotificationRepository notifications;
    private EmailService emails;
    private FacilityMaintenanceService service;

    @BeforeEach void setUp() {
        schedules = mock(FacilityMaintenanceScheduleRepository.class);
        tenants = mock(TenantRepository.class);
        notifications = mock(NotificationRepository.class);
        emails = mock(EmailService.class);
        when(schedules.save(any())).thenAnswer(invocation -> {
            FacilityMaintenanceSchedule schedule = invocation.getArgument(0);
            if (schedule.getId() == null) schedule.setId("schedule-1");
            return schedule;
        });
        service = new FacilityMaintenanceService(schedules, tenants, notifications, emails);
    }

    @Test void expandsFloorDeduplicatesRoomsAndNotifiesOnlyItsTenant() {
        Tenant affected = tenant("tenant-1", "T1-04-01", "401");
        Tenant elsewhere = tenant("tenant-2", "T1-05-01", "501");
        when(tenants.findAll()).thenReturn(List.of(affected, elsewhere));
        when(emails.sendMaintenanceNotice(eq(affected), any(), eq("Water shutdown")))
                .thenReturn(new EmailService.SendResult(true, "sent"));

        String inTwoDays = LocalDateTime.now(ZoneId.of("Asia/Manila")).plusHours(48).withSecond(0).withNano(0).toString();
        var result = service.create(new CreateFacilityMaintenanceRequest(
                List.of("T1-04-01"), List.of("T1-04"), inTwoDays, "Water shutdown"));

        assertEquals(10, result.affectedRoomIds().size());
        assertEquals(1, result.notifiedTenants());
        assertEquals(1, result.emailsSent());
        assertEquals(0, result.emailsFailed());
        verify(notifications, times(1)).save(any());
        verify(emails).sendMaintenanceNotice(eq(affected), any(), eq("Water shutdown"));
        verify(emails, never()).sendMaintenanceNotice(eq(elsewhere), any(), any());
    }

    @Test void rejectsSchedulesWithoutFullAdvanceNotice() {
        String tooSoon = LocalDateTime.now(ZoneId.of("Asia/Manila")).plusHours(12).withSecond(0).withNano(0).toString();
        assertThrows(ApiException.class, () -> service.create(new CreateFacilityMaintenanceRequest(
                List.of("T1-04-01"), List.of(), tooSoon, "Inspection")));
        verifyNoInteractions(tenants, notifications, emails);
    }

    private static Tenant tenant(String id, String roomId, String unit) {
        Tenant tenant = new Tenant();
        tenant.setId(id);
        tenant.setRoomId(roomId);
        tenant.setUnit(unit);
        tenant.setFirstName("Alex");
        tenant.setLastName("Resident");
        tenant.setEmail(id + "@example.com");
        return tenant;
    }
}
