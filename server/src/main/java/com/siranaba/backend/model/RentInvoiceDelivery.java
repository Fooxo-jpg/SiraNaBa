package com.siranaba.backend.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.Instant;

/** Delivery receipt for one rent obligation. The obligation id makes scheduled retries idempotent. */
@Data
@Document(collection = "rent_invoice_deliveries")
public class RentInvoiceDelivery {
    @Id private String id;
    private String tenantId;
    private String obligationId;
    private boolean notificationSent;
    private boolean emailSent;
    private Instant notificationSentAt;
    private Instant emailSentAt;
    private String lastEmailError;
}
