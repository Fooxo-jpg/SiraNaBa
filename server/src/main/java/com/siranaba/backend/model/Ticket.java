package com.siranaba.backend.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.index.Indexed;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@Document(collection = "tickets")
public class Ticket {

    /** Human-friendly ref like "TKT-4213", assigned manually - see TicketIdGenerator. */
    @Id
    private String id;

    @Indexed
    @Field("tenantId")
    private String tenantId;

    private String category;
    private String title;
    private String description;
    private String location;

    /** Null while AI triage / assessment is still pending -> UI renders "Severity: Loading". */
    private String priority;

    /** Submitted | Assigned | Resolved */
    private String stage = "Submitted";

    /** Admin dispatch outcome: Assigned | Fixed Problem | Escalated | Cancelled. */
    private String dispatchStatus = "Assigned";

    private Instant submittedAt;
    private Instant updatedAt;
    private String estimatedCompletion;

    private Specialist specialist = Specialist.unassigned();
    /** Staff record that owns the assignment; used to release workload on completion. */
    private String assignedStaffId;
    private List<Attachment> attachments = new ArrayList<>();
    private String safetyNote = "";
    private List<TimelineEvent> timeline = new ArrayList<>();
}
