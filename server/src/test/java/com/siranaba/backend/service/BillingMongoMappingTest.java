package com.siranaba.backend.service;

import com.siranaba.backend.model.Billing;
import org.bson.Document;
import org.bson.types.Decimal128;
import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.convert.*;
import org.springframework.data.mongodb.core.mapping.MongoMappingContext;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static com.siranaba.backend.service.BillingAccountingTest.*;

/** Exercises the actual Mongo converter without connecting to or modifying a database. */
class BillingMongoMappingTest {
    MappingMongoConverter converter() throws Exception {
        var conversions = MongoCustomConversions.create(config -> {});
        var context = new MongoMappingContext(); context.setSimpleTypeHolder(conversions.getSimpleTypeHolder()); context.afterPropertiesSet();
        var converter = new MappingMongoConverter(NoOpDbRefResolver.INSTANCE, context);
        converter.setCustomConversions(conversions); converter.afterPropertiesSet(); return converter;
    }
    @Test void decimalBalancesAllocationsAndRetryKeysSurviveMongoRoundTrip() throws Exception {
        var converter = converter(); Billing b = ledger("5000", "2500");
        var request = request("2000.25", "RENT", "roundtrip-request", null);
        var first = BillingAccounting.pay(b, request, "GCash", true);
        Document raw = new Document(); converter.write(b, raw);
        var tx = raw.getList("transactions", Document.class).get(0);
        assertInstanceOf(Decimal128.class, tx.get("amount"));
        assertEquals(first.getRequestFingerprint(), tx.getString("requestFingerprint"));
        assertTrue(raw.getList("notificationOutbox", Document.class).get(0).containsKey("_id"));
        Billing restored = converter.read(Billing.class, raw);
        eq("2999.75", restored.getRentBalance()); eq("2500", restored.getUtilityBalance());
        assertEquals(first.getId(), BillingAccounting.pay(restored, request, "GCash", true).getId());
        assertEquals(1, restored.getTransactions().size());
    }
    @Test void legacyDoubleAmountsRemainReadableWithoutInventedAllocations() throws Exception {
        Document raw = new Document("tenantId", "tenant-1").append("transactions", List.of(new Document("id", "OLD-REF")
            .append("amount", 2450.50).append("status", "Successful").append("title", "Rent payment")));
        Billing b = converter().read(Billing.class, raw);
        eq("2450.50", b.getTransactions().get(0).getAmount());
        assertNull(b.getTransactions().get(0).getRentAllocation()); assertNull(b.getTransactions().get(0).getPaymentType());
    }
}
