package com.siranaba.backend.service;

import com.siranaba.backend.dto.CreateFacilityMaintenanceRequest;
import com.siranaba.backend.dto.FacilityMaintenanceResponse;
import com.siranaba.backend.exception.ApiException;
import com.siranaba.backend.model.Cta;
import com.siranaba.backend.model.FacilityMaintenanceSchedule;
import com.siranaba.backend.model.NotificationDoc;
import com.siranaba.backend.model.Tenant;
import com.siranaba.backend.repository.FacilityMaintenanceScheduleRepository;
import com.siranaba.backend.repository.NotificationRepository;
import com.siranaba.backend.repository.TenantRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;

@Service
public class FacilityMaintenanceService {
    private static final ZoneId BUILDING_ZONE = ZoneId.of("Asia/Manila");
    private static final DateTimeFormatter DISPLAY_TIME = DateTimeFormatter.ofPattern("MMMM d, uuuu 'at' h:mm a", Locale.ENGLISH);

    private final FacilityMaintenanceScheduleRepository schedules;
    private final TenantRepository tenants;
    private final NotificationRepository notifications;
    private final EmailService emailService;

    public FacilityMaintenanceService(FacilityMaintenanceScheduleRepository schedules, TenantRepository tenants,
                                      NotificationRepository notifications, EmailService emailService) {
        this.schedules = schedules;
        this.tenants = tenants;
        this.notifications = notifications;
        this.emailService = emailService;
    }

    public List<FacilityMaintenanceResponse> listUpcoming() {
        return schedules.findByStatusAndScheduledAtAfterOrderByScheduledAtAsc("Scheduled", Instant.now())
                .stream().map(this::response).toList();
    }

    public FacilityMaintenanceResponse create(CreateFacilityMaintenanceRequest request) {
        LinkedHashSet<String> selectedRooms = new LinkedHashSet<>(safe(request.roomIds()));
        LinkedHashSet<String> selectedFloors = new LinkedHashSet<>(safe(request.floorIds()));
        if (selectedRooms.isEmpty() && selectedFloors.isEmpty())
            throw new ApiException(HttpStatus.BAD_REQUEST, "Select at least one room or residential floor.");

        selectedRooms.forEach(BuildingCatalog::requireRoomId);
        LinkedHashSet<String> affectedRooms = new LinkedHashSet<>(selectedRooms);
        selectedFloors.forEach(floor -> affectedRooms.addAll(BuildingCatalog.roomIdsForFloor(floor)));

        ZonedDateTime localTime;
        try { localTime = LocalDateTime.parse(request.scheduledAt()).atZone(BUILDING_ZONE); }
        catch (DateTimeParseException error) { throw new ApiException(HttpStatus.BAD_REQUEST, "Choose a valid maintenance date and time."); }

        ZonedDateTime now = ZonedDateTime.now(BUILDING_ZONE).withSecond(0).withNano(0);
        if (localTime.isBefore(now.plusHours(24)) || localTime.isAfter(now.plusHours(72)))
            throw new ApiException(HttpStatus.BAD_REQUEST, "Maintenance must be scheduled between 24 and 72 hours from now.");

        FacilityMaintenanceSchedule schedule = new FacilityMaintenanceSchedule();
        schedule.setSelectedRoomIds(new ArrayList<>(selectedRooms));
        schedule.setSelectedFloorIds(new ArrayList<>(selectedFloors));
        schedule.setAffectedRoomIds(new ArrayList<>(affectedRooms));
        schedule.setScheduledAt(localTime.toInstant());
        schedule.setReason(request.reason().trim());
        schedule.setStatus("Scheduled");
        schedule.setCreatedAt(Instant.now());
        schedule = schedules.save(schedule);

        int notified = 0, sent = 0, failed = 0;
        String when = localTime.format(DISPLAY_TIME);
        Set<String> roomSet = Set.copyOf(affectedRooms);
        for (Tenant tenant : tenants.findAll()) {
            if (!roomSet.contains(tenant.getRoomId())) continue;
            NotificationDoc notification = new NotificationDoc();
            notification.setId("facility-maintenance-" + schedule.getId() + "-" + tenant.getId());
            notification.setTenantId(tenant.getId());
            notification.setCategory("Maintenance");
            notification.setTitle("Scheduled maintenance notice");
            notification.setBody("Maintenance for Unit " + tenant.getUnit() + " is scheduled for " + when + ". Reason: " + schedule.getReason());
            notification.setTimestamp(schedule.getCreatedAt());
            notification.setCta(new Cta("View notice", "/notifications"));
            notification.setRead(false);
            notifications.save(notification);
            notified++;
            if (emailService.sendMaintenanceNotice(tenant, when, schedule.getReason()).sent()) sent++; else failed++;
        }
        schedule.setNotifiedTenants(notified);
        schedule.setEmailsSent(sent);
        schedule.setEmailsFailed(failed);
        return response(schedules.save(schedule));
    }

    private static List<String> safe(List<String> values) {
        if (values == null) return List.of();
        return values.stream().filter(Objects::nonNull).map(String::trim).filter(v -> !v.isEmpty()).toList();
    }

    private FacilityMaintenanceResponse response(FacilityMaintenanceSchedule value) {
        return new FacilityMaintenanceResponse(value.getId(), value.getSelectedRoomIds(), value.getSelectedFloorIds(),
                value.getAffectedRoomIds(), value.getScheduledAt(), value.getReason(), value.getStatus(), value.getCreatedAt(),
                value.getNotifiedTenants(), value.getEmailsSent(), value.getEmailsFailed());
    }
}
