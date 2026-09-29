package com.siranaba.backend.service;

import com.siranaba.backend.dto.TicketReportDetailsRequest;
import com.siranaba.backend.exception.ResourceNotFoundException;
import com.siranaba.backend.model.Ticket;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class TicketReportServiceTest {
    @Test
    void editsPreserveWorkflowAndDeriveFloorFromUnit() {
        MongoTemplate mongo = mock(MongoTemplate.class);
        AuditLogService audit = mock(AuditLogService.class);
        Ticket returned = new Ticket();
        returned.setUnit("1203");
        returned.setStage("Resolved");
        when(mongo.findAndModify(any(Query.class), any(Update.class), any(FindAndModifyOptions.class), eq(Ticket.class))).thenReturn(returned);
        Ticket result = new TicketReportService(mongo, audit).update("TKT-1000", new TicketReportDetailsRequest(" Kitchen leak ", 1, " 1203 "));
        ArgumentCaptor<Update> update = ArgumentCaptor.forClass(Update.class);
        verify(mongo).findAndModify(any(Query.class), update.capture(), any(FindAndModifyOptions.class), eq(Ticket.class));
        var fields = update.getValue().getUpdateObject().get("$set", org.bson.Document.class);
        assertEquals(1, fields.get("tower"));
        assertEquals("1203", fields.get("unit"));
        assertEquals("Kitchen leak", fields.get("issueType"));
        assertEquals(java.util.Set.of("tower", "unit", "issueType", "updatedAt"), fields.keySet());
        assertEquals("12", result.getFloorNumber());
        assertEquals("Resolved", result.getStage());
        verify(audit).update(eq("TICKET"), contains("Floor 12"));
    }

    @Test
    void missingTicketIsNotInserted() {
        MongoTemplate mongo = mock(MongoTemplate.class);
        AuditLogService audit = mock(AuditLogService.class);
        assertThrows(ResourceNotFoundException.class, () -> new TicketReportService(mongo, audit).update("missing", new TicketReportDetailsRequest("Leak", 1, "405")));
        verifyNoInteractions(audit);
    }

    @Test
    void validatesReportDetailsWithoutRequiringManualFloor() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            assertTrue(validator.validate(new TicketReportDetailsRequest("Leak", 1, "405")).isEmpty());
            assertFalse(validator.validate(new TicketReportDetailsRequest(" ", 0, "")).isEmpty());
        }
    }
}
