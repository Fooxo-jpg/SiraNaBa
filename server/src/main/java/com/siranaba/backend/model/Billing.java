package com.siranaba.backend.model;
import com.fasterxml.jackson.annotation.*;
import lombok.*;
import org.springframework.data.annotation.*;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
/** Model B: obligations, allocations and history commit atomically in one Mongo document. */
@Data @NoArgsConstructor @Document(collection = "billing")
public class Billing {
    @Id private String id;
    @Version private Long version;
    @Indexed(unique = true) private String tenantId;
    private int schemaVersion;
    private boolean reconciliationRequired;
    @org.springframework.data.mongodb.core.mapping.Field(targetType = org.springframework.data.mongodb.core.mapping.FieldType.DECIMAL128) private BigDecimal legacyOutstandingAmount;
    private String reconciliationNote;
    private Instant reconciledAt;
    private String reconciledBy;
    private boolean archived;
    private TenantSnapshot tenantSnapshot;
    public record TenantSnapshot(String code, String firstName, String lastName, String unit, String building) {}
    private List<RentObligation> rentObligations = new ArrayList<>();
    private List<UtilityStatement> utilityStatements = new ArrayList<>();
    private List<Transaction> transactions = new ArrayList<>();
    private List<PaymentMethod> paymentMethods = new ArrayList<>();
    @JsonIgnore private List<NotificationDoc> notificationOutbox = new ArrayList<>();
    // Legacy evidence only; never the authority for new charges or payments.
    @JsonIgnore private double currentBalanceDue;
    @JsonIgnore private String dueDate;
    @JsonIgnore private boolean autoPayActive;
    @JsonIgnore private List<BreakdownLine> breakdown = new ArrayList<>();
    @JsonIgnore private List<UtilityBreakdown> utilityBreakdowns = new ArrayList<>();
    @JsonIgnore private String utilityStatementPeriod;
    @JsonIgnore private int totalTransactionCount;
    public static Billing empty(String tenantId) { Billing b = new Billing(); b.setTenantId(tenantId); return b; }
    public BigDecimal getRentBalance() { return reconciliationRequired ? null : rentObligations.stream().map(RentObligation::getBalance).reduce(BigDecimal.ZERO, BigDecimal::add); }
    public BigDecimal getRentPaid() { return rentObligations.stream().map(RentObligation::getPaid).reduce(BigDecimal.ZERO, BigDecimal::add); }
    public BigDecimal getUtilityBalance() { return reconciliationRequired ? null : utilityStatements.stream().map(UtilityStatement::getBalance).reduce(BigDecimal.ZERO, BigDecimal::add); }
    public BigDecimal getTotalOutstanding() { return reconciliationRequired ? null : getRentBalance().add(getUtilityBalance()); }
    public BigDecimal getTotalPaid() { return transactions.stream().filter(t -> "PAID".equals(t.getStatus()) || "Successful".equals(t.getStatus())).map(Transaction::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add); }
    public String getRentDueDate() { return rentObligations.stream().filter(r -> r.getBalance().signum() > 0).map(RentObligation::getDueDate).filter(Objects::nonNull).min(String::compareTo).orElse(null); }
    public String getRentStatus() {
        if (reconciliationRequired) return "REVIEW_REQUIRED";
        if (getRentBalance().signum() == 0) return "PAID";
        if (rentObligations.stream().anyMatch(r -> "OVERDUE".equals(r.getStatus()))) return "OVERDUE";
        return rentObligations.stream().anyMatch(r -> r.getBalance().signum() > 0 && r.getPaid().signum() > 0) ? "PARTIALLY_PAID" : "UNPAID";
    }
    public int getPaymentCount() { return transactions.size(); }
    public static String status(BigDecimal amount, BigDecimal paid, String dueDate) {
        if (paid.compareTo(amount) >= 0) return "PAID";
        if (dueDate != null && LocalDate.parse(dueDate).isBefore(LocalDate.now(ZoneId.of("Asia/Manila")))) return "OVERDUE";
        return paid.signum() > 0 ? "PARTIALLY_PAID" : "UNPAID";
    }
    @Data @NoArgsConstructor public static class RentObligation {
        private String id;
        private String billingPeriod;
        private String dueDate;
        @org.springframework.data.mongodb.core.mapping.Field(targetType = org.springframework.data.mongodb.core.mapping.FieldType.DECIMAL128) private BigDecimal amount = BigDecimal.ZERO;
        @org.springframework.data.mongodb.core.mapping.Field(targetType = org.springframework.data.mongodb.core.mapping.FieldType.DECIMAL128) private BigDecimal paid = BigDecimal.ZERO;
        public BigDecimal getBalance() { return amount.subtract(paid); }
        public String getStatus() { return status(amount, paid, dueDate); }
    }
    @Data @NoArgsConstructor public static class UtilityStatement {
        private boolean openingBalance;
        private String id;
        private String billingPeriod;
        private String statementDate;
        private String dueDate;
        private Instant createdAt;
        private int revision = 1;
        @org.springframework.data.mongodb.core.mapping.Field(targetType = org.springframework.data.mongodb.core.mapping.FieldType.DECIMAL128) private BigDecimal waterUsage = BigDecimal.ZERO;
        @org.springframework.data.mongodb.core.mapping.Field(targetType = org.springframework.data.mongodb.core.mapping.FieldType.DECIMAL128) private BigDecimal waterRate = BigDecimal.ZERO;
        @org.springframework.data.mongodb.core.mapping.Field(targetType = org.springframework.data.mongodb.core.mapping.FieldType.DECIMAL128) private BigDecimal waterCharge = BigDecimal.ZERO;
        @org.springframework.data.mongodb.core.mapping.Field(targetType = org.springframework.data.mongodb.core.mapping.FieldType.DECIMAL128) private BigDecimal electricityUsage = BigDecimal.ZERO;
        @org.springframework.data.mongodb.core.mapping.Field(targetType = org.springframework.data.mongodb.core.mapping.FieldType.DECIMAL128) private BigDecimal electricityRate = BigDecimal.ZERO;
        @org.springframework.data.mongodb.core.mapping.Field(targetType = org.springframework.data.mongodb.core.mapping.FieldType.DECIMAL128) private BigDecimal electricityCharge = BigDecimal.ZERO;
        @org.springframework.data.mongodb.core.mapping.Field(targetType = org.springframework.data.mongodb.core.mapping.FieldType.DECIMAL128) private BigDecimal parkingCharge = BigDecimal.ZERO;
        @org.springframework.data.mongodb.core.mapping.Field(targetType = org.springframework.data.mongodb.core.mapping.FieldType.DECIMAL128) private BigDecimal amount = BigDecimal.ZERO;
        @org.springframework.data.mongodb.core.mapping.Field(targetType = org.springframework.data.mongodb.core.mapping.FieldType.DECIMAL128) private BigDecimal paid = BigDecimal.ZERO;
        private List<UtilityRevision> revisions = new ArrayList<>();
        public BigDecimal getBalance() { return amount.subtract(paid); }
        public String getStatus() { return status(amount, paid, dueDate); }
    }
    public record UtilityRevision(int revision, Instant archivedAt, String dueDate, BigDecimal waterUsage,
        BigDecimal waterRate, BigDecimal waterCharge, BigDecimal electricityUsage, BigDecimal electricityRate,
        BigDecimal electricityCharge, BigDecimal parkingCharge, BigDecimal amount) {}
    public record Allocation(String obligationId, String obligationType, String billingPeriod, BigDecimal amount) {}
    @Data @NoArgsConstructor public static class Transaction {
        private String id;
        private String tenantId;
        private String idempotencyKey;
        @JsonIgnore private String requestFingerprint;
        private String title;
        private String date;
        @org.springframework.data.mongodb.core.mapping.Field(targetType = org.springframework.data.mongodb.core.mapping.FieldType.DECIMAL128) private BigDecimal amount = BigDecimal.ZERO;
        private String paymentType;
        @org.springframework.data.mongodb.core.mapping.Field(targetType = org.springframework.data.mongodb.core.mapping.FieldType.DECIMAL128) private BigDecimal rentAllocation;
        @org.springframework.data.mongodb.core.mapping.Field(targetType = org.springframework.data.mongodb.core.mapping.FieldType.DECIMAL128) private BigDecimal utilityAllocation;
        private List<Allocation> allocations = new ArrayList<>();
        private String relatedUtilityStatementId;
        private String billingPeriod;
        private String status;
        private String paymentMode;
        private String recordedBy;
        private boolean simulated;
        private Instant createdAt;
        private Instant paidAt;
    }
    @Data @NoArgsConstructor @AllArgsConstructor public static class PaymentMethod {
        private String id; private String type; private String provider; private String accountName;
        private String last4; private String expiry;
        @JsonProperty("isPrimary") private boolean primary;
    }
    @Data @NoArgsConstructor @AllArgsConstructor public static class BreakdownLine { private String label; private double amount; }
    @Data @NoArgsConstructor @AllArgsConstructor public static class UtilityBreakdown {
        private String id; private String label; private Double value; private String unit;
        private String deltaLabel; private String trend; private double usageVsLimit;
    }
}
