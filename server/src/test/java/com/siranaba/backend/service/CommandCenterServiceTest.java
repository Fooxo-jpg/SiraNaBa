package com.siranaba.backend.service;

import com.siranaba.backend.model.Ticket;
import com.siranaba.backend.model.TimelineEvent;
import org.junit.jupiter.api.Test;
import java.time.Instant;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class CommandCenterServiceTest {
    private static final Instant NOW = Instant.parse("2026-09-27T04:00:00Z");
    private Ticket ticket(String stage, String submitted) {
        Ticket ticket = new Ticket();
        ticket.setStage(stage);
        ticket.setSubmittedAt(Instant.parse(submitted));
        return ticket;
    }
    @Test void countsOpenAndPendingAndReconstructsYesterdayInManila() {
        Ticket old = ticket("Submitted", "2026-09-26T10:00:00Z");
        Ticket today = ticket("Assigned", "2026-09-26T17:00:00Z");
        today.setAssignedStaffId("staff-1");
        Ticket resolved = ticket("Resolved", "2026-09-25T00:00:00Z");
        resolved.setTimeline(List.of(new TimelineEvent("e", "Fixed Problem", "", Instant.parse("2026-09-26T18:00:00Z"))));
        Ticket cancelled = ticket("Cancelled", "2026-09-26T18:00:00Z");
        var metrics = CommandCenterService.calculate(List.of(old, today, resolved, cancelled), 12, NOW, 300);
        assertEquals(2, metrics.activeIncidents());
        assertEquals(2L, metrics.yesterdayActiveIncidents());
        assertEquals(1, metrics.pendingDispatch());
        assertEquals(12, metrics.totalTenants());
        assertEquals(300, metrics.uptimeSeconds());
    }
    @Test void averagesOnlyAutomaticAssignmentsIncludingLegacyHistory() {
        Ticket automatic = ticket("Assigned", "2026-09-27T00:00:00Z");
        automatic.setAutoAssignedAt(Instant.parse("2026-09-27T00:00:20Z"));
        Ticket legacy = ticket("Assigned", "2026-09-27T00:00:00Z");
        legacy.setTimeline(List.of(new TimelineEvent("a", "Maintenance staff assigned", "Sam (Plumber) was assigned to this ticket.", Instant.parse("2026-09-27T00:00:40Z"))));
        Ticket manual = ticket("Assigned", "2026-09-27T00:00:00Z");
        manual.setTimeline(List.of(new TimelineEvent("m", "Maintenance staff assigned", "Sam (Plumber) was assigned and is coordinating arrival.", Instant.parse("2026-09-27T00:05:00Z"))));
        var metrics = CommandCenterService.calculate(List.of(automatic, legacy, manual), 0, NOW, 0);
        assertEquals(2, metrics.autoAssignmentSamples());
        assertEquals(30.0, metrics.averageAutoAssignmentSeconds());
    }
    @Test void missingHistoryIsNotPresentedAsZero() {
        var metrics = CommandCenterService.calculate(List.of(ticket("Resolved", "2026-09-25T00:00:00Z")), 0, NOW, 0);
        assertNull(metrics.yesterdayActiveIncidents());
        assertNull(metrics.averageAutoAssignmentSeconds());
        var empty = CommandCenterService.calculate(List.of(), 0, NOW, 0);
        assertEquals(0L, empty.yesterdayActiveIncidents());
        assertEquals(0, empty.activeIncidents());
    }
}
