package com.siranaba.backend.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.index.Indexed;

import java.time.Instant;

@Data
@NoArgsConstructor
@Document(collection = "notifications")
public class NotificationDoc {

    @Id
    private String id;

    @Indexed
    @Field("tenantId")
    private String tenantId;

    /** Payments | Maintenance | Community */
    private String category;
    private String title;
    private String body;
    private Instant timestamp;
    private Cta cta;
    private boolean read;
}
