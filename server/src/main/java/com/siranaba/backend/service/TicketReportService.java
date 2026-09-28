package com.siranaba.backend.service;

import com.siranaba.backend.dto.TicketReportDetailsRequest;
import com.siranaba.backend.exception.ResourceNotFoundException;
import com.siranaba.backend.model.Ticket;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Locale;

@Service
public class TicketReportService {
    private final MongoTemplate mongo;
    private final AuditLogService auditLog;

    public TicketReportService(MongoTemplate mongo, AuditLogService auditLog) {
        this.mongo = mongo;
        this.auditLog = auditLog;
    }

    public Ticket update(String id, TicketReportDetailsRequest request) {
        // Update only report fields so a concurrent triage or dispatch change is preserved.
        Update update = new Update()
                .set("issueType", request.issueType().trim())
                .set("tower", request.tower())
                .set("unit", request.unit().trim().toUpperCase(Locale.ROOT))
                .set("updatedAt", Instant.now());
        Ticket saved = mongo.findAndModify(Query.query(Criteria.where("_id").is(id)), update,
                FindAndModifyOptions.options().returnNew(true), Ticket.class);
        if (saved == null) throw new ResourceNotFoundException("Ticket not found.");
        auditLog.update("TICKET", id + " report details updated: " + saved.getIssueType()
                + "; Tower " + saved.getTower() + ", Floor " + saved.getFloorNumber() + ", Unit " + saved.getUnit()
                );
        return saved;
    }
}
