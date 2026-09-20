package com.siranaba.backend.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
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
    /** Saved payment methods: cards, e-wallets (GCash, Maya) and online banking. */
    private List<PaymentMethod> paymentMethods = new ArrayList<>();
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

    /**
     * A saved way to pay. Only display-safe data is stored: for cards that is the
     * brand, last 4 digits, expiry and holder name - never the full card number or CVV.
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaymentMethod {
        private String id;
        /** CARD | EWALLET | BANK */
        private String type;
        /** Visa / Mastercard / ... for cards, GCash / Maya, or the bank name (BDO, BPI, RCBC, ...). */
        private String provider;
        private String accountName;
        /** Last 4 digits of the card number, mobile number or bank account. */
        private String last4;
        /** MM/YY, cards only. */
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
        /** The payment reference code, e.g. SNB-20260920-K7M2QX. */
        private String id;
        private String title;
        private String date;
        private double amount;
        /** Successful | Pending | Failed */
        private String status;
        /** How it was paid, e.g. "GCash" or "BDO Online Banking". Null for older records. */
        private String paymentMode;
        private Instant paidAt;

        public Transaction(String id, String title, String date, double amount, String status) {
            this(id, title, date, amount, status, null, null);
        }
    }
}
