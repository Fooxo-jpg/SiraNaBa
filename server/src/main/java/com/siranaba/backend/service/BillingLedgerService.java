package com.siranaba.backend.service;

import com.siranaba.backend.exception.ApiException;
import com.siranaba.backend.exception.ResourceNotFoundException;
import com.siranaba.backend.model.Billing;
import com.siranaba.backend.model.Tenant;
import com.siranaba.backend.repository.BillingRepository;
import com.siranaba.backend.repository.TenantRepository;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.util.function.Function;

/** One versioned Mongo document commits obligations, allocations, history and outbox atomically. */
@Service
public class BillingLedgerService {
    private final BillingRepository repository;
    private final TenantRepository tenants;
    private final MongoTemplate mongo;
    public BillingLedgerService(BillingRepository repository, TenantRepository tenants, MongoTemplate mongo) {
        this.repository = repository; this.tenants = tenants; this.mongo = mongo;
    }
    public Billing get(String tenantId) {
        Tenant tenant = tenants.findById(tenantId).orElseThrow(() -> new ResourceNotFoundException("Tenant not found."));
        Billing b = repository.findByTenantId(tenantId).orElse(null);
        if (b == null) {
            b = Billing.empty(tenantId);
            b.setId("BILLING-" + tenantId);
            b.setSchemaVersion(2);
            b.setReconciliationRequired(true);
            b.setLegacyOutstandingAmount(tenant.getLegacyCurrentBalance() == null ? null : BigDecimal.valueOf(tenant.getLegacyCurrentBalance()));
            try { return repository.insert(b); }
            catch (DuplicateKeyException race) { return get(tenantId); }
        }
        if (b.getSchemaVersion() < 2) {
            // Conditional migration preserves all old statements/transactions as evidence.
            // Update directly: a legacy null @Version would otherwise be mistaken for a new document.
            Query q = Query.query(Criteria.where("_id").is(b.getId()).and("schemaVersion").ne(2));
            Update u = new Update().set("schemaVersion", 2).set("reconciliationRequired", true)
                    .set("legacyOutstandingAmount", tenant.getLegacyCurrentBalance() == null ? null : BigDecimal.valueOf(tenant.getLegacyCurrentBalance()))
                    .set("version", 0L);
            mongo.updateFirst(q, u, Billing.class);
            return repository.findByTenantId(tenantId).orElseThrow();
        }
        return b;
    }
    public <T> T mutate(String tenantId, Function<Billing, T> action) {
        for (int attempt = 0; attempt < 5; attempt++) {
            Billing b = get(tenantId);
            T result = action.apply(b);
            try { repository.save(b); return result; }
            catch (OptimisticLockingFailureException conflict) { /* Reload and revalidate, including idempotency. */ }
        }
        throw new ApiException(HttpStatus.CONFLICT, "Billing changed concurrently. Retry with the same payment request key.");
    }
    public Billing saveMethods(Billing b) {
        try { return repository.save(b); }
        catch (OptimisticLockingFailureException ex) {
            throw new ApiException(HttpStatus.CONFLICT, "Billing changed. Refresh before editing payment methods again.");
        }
    }
    public Tenant project(Tenant t) {
        Billing b = get(t.getId());
        t.setRentBalance(b.getRentBalance()); t.setUtilityBalance(b.getUtilityBalance());
        t.setTotalOutstanding(b.getTotalOutstanding()); t.setRentPaid(b.getRentPaid());
        t.setRentStatus(b.getRentStatus()); t.setBillingReconciliationRequired(b.isReconciliationRequired());
        t.setRentDueDate(b.getRentDueDate());
        // Dashboard usage is a projection of the latest verified statement, not a second billing source.
        var latest = b.getUtilityStatements().stream().filter(s -> !s.isOpeningBalance())
                .max(java.util.Comparator.comparing(Billing.UtilityStatement::getBillingPeriod)).orElse(null);
        if (latest != null) {
            double water = latest.getWaterUsage().doubleValue(), electricity = latest.getElectricityUsage().doubleValue();
            t.setUtilityUsage(new com.siranaba.backend.model.UtilityUsage(latest.getBillingPeriod(),
                new com.siranaba.backend.model.UtilityUsage.UsageMetric(electricity, 0, "kWh", null),
                new com.siranaba.backend.model.UtilityUsage.UsageMetric(water, 0, "m³", null)));
        } else t.setUtilityUsage(null);
        return t;
    }
    public static Billing initial(Tenant t) {
        Billing b = Billing.empty(t.getId()); b.setId("BILLING-" + t.getId()); b.setSchemaVersion(2);
        if (t.getMonthlyRent() > 0) b.getRentObligations().add(BillingAccounting.rent(
                t.getRentDueDate().substring(0, 7), t.getRentDueDate(), BigDecimal.valueOf(t.getMonthlyRent()), BigDecimal.ZERO));
        return b;
    }
}
