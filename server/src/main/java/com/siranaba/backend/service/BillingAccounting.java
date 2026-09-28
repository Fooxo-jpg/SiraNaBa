package com.siranaba.backend.service;

import com.siranaba.backend.dto.*;
import com.siranaba.backend.exception.ApiException;
import com.siranaba.backend.model.*;
import com.siranaba.backend.model.Billing.*;
import org.springframework.http.HttpStatus;
import java.math.*;
import java.time.*;
import java.util.*;

/** Pure allocation/calculation rules. Persistence commits the complete aggregate with optimistic locking. */
public final class BillingAccounting {
    private BillingAccounting() {}
    public static final ZoneId MANILA = ZoneId.of("Asia/Manila");
    public static BigDecimal money(BigDecimal value) {
        if (value == null || value.signum() < 0 || value.compareTo(new BigDecimal("1000000000")) > 0)
            throw bad("Amounts must be between zero and PHP 1,000,000,000.");
        try { return value.setScale(2, RoundingMode.UNNECESSARY); }
        catch (ArithmeticException ex) { throw bad("Payment and charge amounts support at most two decimal places."); }
    }
    public static BigDecimal measurement(BigDecimal value) {
        if (value == null || value.signum() < 0 || value.compareTo(new BigDecimal("1000000000")) > 0 || value.scale() > 6)
            throw bad("Enter a valid non-negative usage or rate (up to six decimal places).");
        return value;
    }
    public static String period(String value) {
        try { if (value == null || !value.matches("\\d{4}-\\d{2}")) throw new IllegalArgumentException(); return YearMonth.parse(value).toString(); }
        catch (RuntimeException ex) { throw bad("Billing period must be YYYY-MM."); }
    }
    public static String date(String value) {
        try { return LocalDate.parse(value).toString(); } catch (RuntimeException ex) { throw bad("A valid due date is required."); }
    }
    public static void ready(Billing billing) {
        if (billing.isArchived()) throw new ApiException(HttpStatus.CONFLICT, "This tenant's billing account is archived.");
        if (billing.getSchemaVersion() != 2 || billing.isReconciliationRequired())
            throw new ApiException(HttpStatus.CONFLICT, "Billing needs administrator reconciliation before charges or payments can be applied.");
    }
    public static RentObligation rent(String period, String dueDate, BigDecimal amount, BigDecimal paid) {
        RentObligation rent = new RentObligation(); rent.setId("RENT-" + UUID.randomUUID());
        rent.setBillingPeriod(period(period)); rent.setDueDate(date(dueDate));
        rent.setAmount(money(amount)); rent.setPaid(money(paid));
        if (rent.getPaid().compareTo(rent.getAmount()) > 0) throw bad("Rent paid cannot exceed its charge.");
        return rent;
    }
    public static Transaction pay(Billing billing, PayRequest request, String method, boolean simulated) {
        ready(billing);
        BigDecimal amount = money(request.amount());
        if (amount.signum() == 0) throw bad("Payment amount must be greater than zero.");
        String type = "BOTH".equals(request.paymentType()) ? "COMBINED" : request.paymentType();
        if (type == null || !Set.of("RENT", "UTILITY", "COMBINED").contains(type)) throw bad("Payment type must be RENT, UTILITY or COMBINED.");
        String key = request.idempotencyKey();
        if (key == null || !key.matches("[A-Za-z0-9_-]{8,100}")) throw bad("A valid payment idempotency key is required.");
        String fingerprint = type + "|" + amount.toPlainString() + "|" + Objects.toString(request.relatedUtilityStatementId(), "") + "|" + method
            + "|" + Objects.toString(request.paymentMethodId(), "") + "|" + Objects.toString(request.type(), "") + "|" + Objects.toString(request.provider(), "") + "|" + simulated;
        Transaction existing = billing.getTransactions().stream().filter(t -> key.equals(t.getIdempotencyKey()) || key.equals(t.getId())).findFirst().orElse(null);
        if (existing != null) {
            if (!fingerprint.equals(existing.getRequestFingerprint())) throw new ApiException(HttpStatus.CONFLICT, "This payment key was already used with different details.");
            return existing;
        }
        if ("RENT".equals(type) && request.relatedUtilityStatementId() != null) throw bad("A rent payment cannot target a utility statement.");
        List<UtilityStatement> utilities = billing.getUtilityStatements().stream()
            .filter(s -> request.relatedUtilityStatementId() == null || request.relatedUtilityStatementId().equals(s.getId()))
            .sorted(Comparator.comparing(UtilityStatement::getDueDate).thenComparing(UtilityStatement::getBillingPeriod)).toList();
        if (!"RENT".equals(type) && request.relatedUtilityStatementId() != null && utilities.isEmpty()) throw bad("Utility statement not found.");
        BigDecimal utilityAvailable = utilities.stream().map(UtilityStatement::getBalance).reduce(BigDecimal.ZERO, BigDecimal::add);
        if ("UTILITY".equals(type) && (utilities.isEmpty() || utilityAvailable.signum() == 0)) throw bad("There is no unpaid utility statement to pay.");
        BigDecimal applicable = "RENT".equals(type) ? billing.getRentBalance() : "UTILITY".equals(type) ? utilityAvailable : billing.getRentBalance().add(utilityAvailable);
        if (amount.compareTo(applicable) > 0) throw bad("Payment exceeds the selected outstanding balance.");
        BigDecimal remaining = amount, rentTotal = BigDecimal.ZERO, utilityTotal = BigDecimal.ZERO;
        List<Allocation> allocations = new ArrayList<>();
        if (!"UTILITY".equals(type)) {
            // Due date order: overdue rent first, then current/future issued rent.
            for (RentObligation rent : billing.getRentObligations().stream().sorted(Comparator.comparing(RentObligation::getDueDate)).toList()) {
                BigDecimal take = remaining.min(rent.getBalance());
                if (take.signum() == 0) continue;
                rent.setPaid(rent.getPaid().add(take)); remaining = remaining.subtract(take); rentTotal = rentTotal.add(take);
                allocations.add(new Allocation(rent.getId(), "RENT", rent.getBillingPeriod(), take));
            }
        }
        if (!"RENT".equals(type)) for (UtilityStatement statement : utilities) {
            BigDecimal take = remaining.min(statement.getBalance());
            if (take.signum() == 0) continue;
            statement.setPaid(statement.getPaid().add(take)); remaining = remaining.subtract(take); utilityTotal = utilityTotal.add(take);
            allocations.add(new Allocation(statement.getId(), "UTILITY", statement.getBillingPeriod(), take));
        }
        Transaction transaction = new Transaction();
        Instant now = Instant.now();
        transaction.setId(PaymentReferences.next(now)); transaction.setTenantId(billing.getTenantId());
        transaction.setIdempotencyKey(key); transaction.setRequestFingerprint(fingerprint);
        transaction.setPaymentType(type); transaction.setAmount(amount); transaction.setRentAllocation(rentTotal);
        transaction.setUtilityAllocation(utilityTotal); transaction.setAllocations(allocations);
        var utilityIds = allocations.stream().filter(a -> "UTILITY".equals(a.obligationType())).map(Allocation::obligationId).distinct().toList();
        transaction.setRelatedUtilityStatementId(utilityIds.size() == 1 ? utilityIds.get(0) : null);
        transaction.setBillingPeriod(String.join(", ", allocations.stream().map(Allocation::billingPeriod).distinct().toList()));
        transaction.setStatus("PAID"); transaction.setPaymentMode(method); transaction.setSimulated(simulated);
        transaction.setCreatedAt(now); transaction.setPaidAt(now); transaction.setDate(now.atZone(MANILA).toLocalDate().toString());
        transaction.setTitle(("RENT".equals(type) ? "Rent" : "UTILITY".equals(type) ? "Utility" : "Rent and utility") + " payment" + (simulated ? " (simulated)" : " (recorded by management)"));
        billing.getTransactions().add(0, transaction);
        queueNotification(billing, "payment-" + transaction.getId(), transaction.getTitle(),
            String.format(Locale.ENGLISH, "Your payment of PHP %,.2f has been recorded. Rent: PHP %,.2f. Utilities: PHP %,.2f. Reference: %s.%s",
                amount, rentTotal, utilityTotal, transaction.getId(), simulated ? " Simulated payment; no real funds were transferred." : ""));
        return transaction;
    }
    public static PresentBillResponse present(Billing billing, PresentBillRequest request, BigDecimal electricityRate) {
        ready(billing); String period = period(request.billingPeriod()), due = date(request.dueDate());
        BigDecimal waterUsage = measurement(request.waterUsage()), waterRate = measurement(request.waterRate());
        BigDecimal electricityUsage = measurement(request.electricityUsage());
        BigDecimal water = money(waterUsage.multiply(waterRate).setScale(2, RoundingMode.HALF_UP));
        BigDecimal electricity = money(electricityUsage.multiply(measurement(electricityRate)).setScale(2, RoundingMode.HALF_UP));
        BigDecimal parking = request.parkingFee() ? new BigDecimal("1000.00") : new BigDecimal("0.00");
        BigDecimal total = money(water.add(electricity).add(parking));
        UtilityStatement statement = billing.getUtilityStatements().stream().filter(s -> period.equals(s.getBillingPeriod())).findFirst().orElse(null);
        boolean updating = statement != null;
        if (updating) {
            boolean same = !statement.isOpeningBalance() && statement.getWaterUsage().compareTo(waterUsage) == 0 && statement.getWaterRate().compareTo(waterRate) == 0
                && statement.getElectricityUsage().compareTo(electricityUsage) == 0 && statement.getElectricityRate().compareTo(electricityRate) == 0
                && statement.getParkingCharge().compareTo(parking) == 0 && due.equals(statement.getDueDate());
            if (same) return receipt(billing, statement, false, true);
            if (!request.reissue() || request.expectedRevision() == null || request.expectedRevision() != statement.getRevision())
                throw new ApiException(HttpStatus.CONFLICT, "A statement already exists for this period. Load it and explicitly confirm reissue with its current revision.");
            if (total.compareTo(statement.getPaid()) < 0) throw bad("Reissued utility total cannot be less than payments already allocated. Refunds are not supported.");
            statement.getRevisions().add(new UtilityRevision(statement.getRevision(), Instant.now(), statement.getDueDate(),
                statement.getWaterUsage(), statement.getWaterRate(), statement.getWaterCharge(), statement.getElectricityUsage(),
                statement.getElectricityRate(), statement.getElectricityCharge(), statement.getParkingCharge(), statement.getAmount()));
            statement.setRevision(statement.getRevision() + 1);
        } else {
            statement = new UtilityStatement(); statement.setId("UTIL-" + UUID.randomUUID());
            statement.setBillingPeriod(period); statement.setCreatedAt(Instant.now());
            billing.getUtilityStatements().add(statement);
        }
        statement.setOpeningBalance(false);
        statement.setDueDate(due); statement.setStatementDate(LocalDate.now(MANILA).toString());
        statement.setWaterUsage(waterUsage); statement.setWaterRate(waterRate); statement.setWaterCharge(water);
        statement.setElectricityUsage(electricityUsage); statement.setElectricityRate(electricityRate); statement.setElectricityCharge(electricity);
        statement.setParkingCharge(parking); statement.setAmount(total);
        queueNotification(billing, statement.getId() + "-v" + statement.getRevision(), "Utility statement " + (updating ? "reissued" : "generated"),
            String.format(Locale.ENGLISH, "Your %s utility statement has been %s for PHP %,.2f. Due %s. Your rent balance is unchanged.", period, updating ? "reissued" : "generated", total, due));
        return receipt(billing, statement, updating, false);
    }
    private static PresentBillResponse receipt(Billing b, UtilityStatement s, boolean updated, boolean unchanged) {
        return new PresentBillResponse(b.getTenantId(), s.getWaterCharge(), s.getElectricityCharge(), s.getParkingCharge(), s.getAmount(), s.getDueDate(), s.getBillingPeriod(), updated, unchanged, s.getId(), s.getRevision());
    }
    public static void queueNotification(Billing b, String id, String title, String body) {
        NotificationDoc note = new NotificationDoc(); note.setId(id); note.setTenantId(b.getTenantId());
        note.setCategory("Payments"); note.setTitle(title); note.setBody(body); note.setTimestamp(Instant.now());
        note.setCta(new Cta("View Billing", "/billing")); b.getNotificationOutbox().add(note);
    }
    private static ApiException bad(String message) { return new ApiException(HttpStatus.BAD_REQUEST, message); }
}
