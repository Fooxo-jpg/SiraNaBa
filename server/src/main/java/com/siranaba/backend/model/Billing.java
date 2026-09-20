package com.siranaba.backend.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.index.Indexed;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@Document(collection = "billing")
public class Billing {

    @Id
    private String id;

    @Indexed(unique = true)
    @Field("tenantId")
    private String tenantId;

    private double currentBalanceDue;
    private String dueDate;
    private boolean autoPayActive;

    private List<BreakdownLine> breakdown = new ArrayList<>();
    private PaymentMethod paymentMethod;
    private List<UtilityBreakdown> utilityBreakdowns = new ArrayList<>();
    private List<Transaction> transactions = new ArrayList<>();
    private int totalTransactionCount;

    /** A blank billing record: nothing owed, no payment method, no history. */
    public static Billing empty(String tenantId) {
        Billing b = new Billing();
        b.setTenantId(tenantId);
        return b;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BreakdownLine {
        private String label;
        private double amount;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaymentMethod {
        private String brand;
        private String last4;
        private String expiry;

        // Named `primary` on the Java side (Lombok's boolean getter for a field
        // literally called "isPrimary" would be mis-parsed by Jackson as
        // property "primary" and break the response); the JsonProperty pins
        // the wire format to the exact key the front end expects.
        @JsonProperty("isPrimary")
        private boolean primary;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UtilityBreakdown {
        private String id;
        private String label;
        private Double value;
        private String unit;
        private String deltaLabel;
        private String trend;
        private double usageVsLimit;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Transaction {
        private String id;
        private String title;
        private String date;
        private double amount;
        /** Successful | Pending | Failed */
        private String status;
    }
}
