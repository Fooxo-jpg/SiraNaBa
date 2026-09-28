package com.siranaba.backend.service;

import com.siranaba.backend.model.Billing;
import com.siranaba.backend.model.NotificationDoc;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static com.siranaba.backend.service.BillingAccountingTest.*;

class BillingNotificationDispatcherTest {
    @Test void notificationFailureLeavesOutboxQueuedWithoutChangingBalances() {
        var mongo = mock(MongoTemplate.class); Billing b = ledger("5000", "0"); pay(b, "2000", "RENT");
        when(mongo.find(any(Query.class), eq(Billing.class))).thenReturn(List.of(b));
        when(mongo.upsert(any(Query.class), any(Update.class), eq(NotificationDoc.class))).thenThrow(new RuntimeException("offline"));
        assertDoesNotThrow(() -> new BillingNotificationDispatcher(mongo).dispatch());
        verify(mongo, never()).updateFirst(any(Query.class), any(Update.class), eq(Billing.class));
        assertEquals(1, b.getNotificationOutbox().size()); eq("3000", b.getRentBalance());
    }
    @Test void deliveryIsInsertOnlyAndRemovalIncrementsLedgerVersion() {
        var mongo = mock(MongoTemplate.class); Billing b = ledger("5000", "0"); b.setId("ledger-1"); pay(b, "2000", "RENT");
        when(mongo.find(any(Query.class), eq(Billing.class))).thenReturn(List.of(b));
        new BillingNotificationDispatcher(mongo).dispatch();
        var note = ArgumentCaptor.forClass(Update.class); verify(mongo).upsert(any(Query.class), note.capture(), eq(NotificationDoc.class));
        assertTrue(note.getValue().getUpdateObject().containsKey("$setOnInsert")); assertFalse(note.getValue().getUpdateObject().containsKey("$set"));
        var removal = ArgumentCaptor.forClass(Update.class); verify(mongo).updateFirst(any(Query.class), removal.capture(), eq(Billing.class));
        assertTrue(removal.getValue().getUpdateObject().containsKey("$pull")); assertTrue(removal.getValue().getUpdateObject().containsKey("$inc"));
    }
}
