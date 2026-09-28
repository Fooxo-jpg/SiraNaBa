package com.siranaba.backend.service;

import com.mongodb.client.MongoDatabase;
import com.mongodb.client.result.DeleteResult;
import com.siranaba.backend.exception.ApiException;
import com.siranaba.backend.model.User;
import com.siranaba.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class DatabaseCleanupServiceTest {
    MongoTemplate mongo = mock(MongoTemplate.class);
    UserRepository users = mock(UserRepository.class);
    PasswordEncoder passwords = mock(PasswordEncoder.class);
    User admin = new User();
    DatabaseCleanupService service = new DatabaseCleanupService(mongo, users, passwords);

    @BeforeEach void setup() {
        admin.setId("admin"); admin.setRole("ADMIN"); admin.setEmail("admin@example.test"); admin.setPasswordHash("unchanged-hash");
        when(users.findById("admin")).thenReturn(Optional.of(admin));
        MongoDatabase database = mock(MongoDatabase.class);
        when(mongo.getDb()).thenReturn(database);
        when(database.getName()).thenReturn("test-only");
        when(passwords.matches("correct", "unchanged-hash")).thenReturn(true);
    }
    @Test void removesAllApplicationCollectionsButNeverAdminUsersOrSystemCollections() {
        when(mongo.getCollectionNames()).thenReturn(Set.of("users", "tickets", "audit_logs", "system.views"));
        when(mongo.count(any(Query.class), anyString())).thenAnswer(call ->
                "ADMIN".equals(((Query) call.getArgument(0)).getQueryObject().get("role")) ? 2L : 0L);
        when(mongo.remove(any(Query.class), anyString())).thenReturn(DeleteResult.acknowledged(3));
        var result = service.clean("admin", "correct", "DELETE ALL DATA", "test-only");
        assertEquals(9, result.deletedDocuments());
        assertEquals(2, result.preservedAdmins());
        verify(mongo).remove(argThat((Query q) -> q.getQueryObject().toJson().equals("{\"role\": {\"$ne\": \"ADMIN\"}}")), eq("users"));
        verify(mongo).remove(argThat((Query q) -> q.getQueryObject().isEmpty()), eq("tickets"));
        verify(mongo, never()).remove(any(Query.class), eq("system.views"));
        verify(users, never()).save(any());
        assertEquals("unchanged-hash", admin.getPasswordHash());
        assertEquals("admin@example.test", admin.getEmail());
    }
    @Test void wrongPasswordDoesNotDeleteAnything() {
        assertThrows(ApiException.class, () -> service.clean("admin", "wrong", "DELETE ALL DATA", "test-only"));
        verify(mongo, never()).remove(any(Query.class), anyString());
    }
    @Test void nonAdminCannotCleanEvenWithPassword() {
        admin.setRole("TENANT");
        assertThrows(ApiException.class, () -> service.clean("admin", "correct", "DELETE ALL DATA", "test-only"));
        verify(mongo, never()).remove(any(Query.class), anyString());
    }
    @Test void requiresExactConfirmationAndDatabase() {
        assertThrows(ApiException.class, () -> service.clean("admin", "correct", "delete", "test-only"));
        assertThrows(ApiException.class, () -> service.clean("admin", "correct", "DELETE ALL DATA", "wrong-database"));
        verify(mongo, never()).remove(any(Query.class), anyString());
    }
    @Test void partialFailureDoesNotReportSuccessAndReleasesLock() {
        when(mongo.getCollectionNames()).thenReturn(Set.of("tickets", "users"));
        when(mongo.count(any(Query.class), eq("users"))).thenReturn(1L);
        when(mongo.remove(any(Query.class), anyString())).thenThrow(new RuntimeException("offline"));
        var error = assertThrows(ApiException.class, () -> service.clean("admin", "correct", "DELETE ALL DATA", "test-only"));
        assertTrue(error.getMessage().contains("Some data may already be deleted"));
        assertFalse(DatabaseMaintenanceGate.LOCK.isWriteLocked());
    }
}
