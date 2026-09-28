package com.siranaba.backend.service;

import com.siranaba.backend.model.Billing;
import com.siranaba.backend.model.NotificationDoc;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/** Durable outbox: notification failure cannot roll back or falsely fail a committed payment. */
@Service
public class BillingNotificationDispatcher {
    private static final Logger LOG = LoggerFactory.getLogger(BillingNotificationDispatcher.class);
    private final MongoTemplate mongo;
    public BillingNotificationDispatcher(MongoTemplate mongo) { this.mongo = mongo; }
    @Scheduled(fixedDelay = 15000)
    public void dispatch() {
        DatabaseMaintenanceGate.runBackground(() -> {
            try {
                for (Billing b : mongo.find(Query.query(Criteria.where("notificationOutbox.0").exists(true)).limit(100), Billing.class)) {
                    for (NotificationDoc n : b.getNotificationOutbox()) {
                        mongo.upsert(Query.query(Criteria.where("_id").is(n.getId())), new Update()
                                .setOnInsert("tenantId", n.getTenantId()).setOnInsert("category", n.getCategory())
                                .setOnInsert("title", n.getTitle()).setOnInsert("body", n.getBody())
                                .setOnInsert("timestamp", n.getTimestamp()).setOnInsert("cta", n.getCta())
                                .setOnInsert("read", false), NotificationDoc.class);
                        mongo.updateFirst(Query.query(Criteria.where("_id").is(b.getId())),
                                new Update().pull("notificationOutbox", new org.bson.Document("_id", n.getId())).inc("version", 1), Billing.class);
                    }
                }
            } catch (Exception ex) { LOG.warn("Billing notifications remain queued for retry: {}", ex.getMessage()); }
        });
    }
}
