package com.siranaba.backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/** One row in the admin "System Logs" feed — written whenever a service performs a notable insert/update/delete. */
@Document(collection = "audit_logs")
public class AuditLog {

    @Id
    private String id;

    /** INFO | WARN | ERROR */
    private String level;

    /** Insert | Update | Delete */
    private String action;

    /** Short collection/entity label shown in brackets, e.g. STAFF, TICKET, TENANT */
    private String tag;

    /** Human-readable message, e.g. "New Staff" or "TKT-4821 has been deleted" */
    private String text;

    private Instant timestamp;

    public AuditLog() {}

    public AuditLog(String level, String action, String tag, String text, Instant timestamp) {
        this.level = level;
        this.action = action;
        this.tag = tag;
        this.text = text;
        this.timestamp = timestamp;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getLevel() { return level; }
    public void setLevel(String level) { this.level = level; }
    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }
    public String getTag() { return tag; }
    public void setTag(String tag) { this.tag = tag; }
    public String getText() { return text; }
    public void setText(String text) { this.text = text; }
    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }
}