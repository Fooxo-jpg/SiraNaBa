package com.siranaba.backend.service;

import com.siranaba.backend.exception.ApiException;
import com.siranaba.backend.repository.UserRepository;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import java.util.*;

@Service
public class DatabaseCleanupService {
    private final MongoTemplate mongo;
    private final UserRepository users;
    private final PasswordEncoder passwords;
    public DatabaseCleanupService(MongoTemplate mongo, UserRepository users, PasswordEncoder passwords) {
        this.mongo = mongo; this.users = users; this.passwords = passwords;
    }
    public record Result(long deletedDocuments, long preservedAdmins) {}

    public Result clean(String userId, String password, String confirmation, String database) {
        DatabaseMaintenanceGate.LOCK.writeLock().lock();
        try {
            var admin = users.findById(userId).orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Sign in again."));
            if (!"ADMIN".equals(admin.getRole())) throw new ApiException(HttpStatus.FORBIDDEN, "Only an administrator can clean the database.");
            if (!"DELETE ALL DATA".equals(confirmation) || !mongo.getDb().getName().equals(database))
                throw new ApiException(HttpStatus.BAD_REQUEST, "Database or confirmation does not match. Refresh and try again.");
            if (password == null || !passwords.matches(password, admin.getPasswordHash()))
                throw new ApiException(HttpStatus.FORBIDDEN, "Current admin password is incorrect.");
            var collections = mongo.getCollectionNames().stream().filter(name -> !name.startsWith("system.")).sorted().toList();
            long preserved = mongo.count(Query.query(Criteria.where("role").is("ADMIN")), "users");
            if (preserved == 0) throw new ApiException(HttpStatus.CONFLICT, "No admin account found; cleanup was cancelled.");
            long deleted = 0;
            try {
                for (String collection : collections) {
                    Query query = deletionQuery(collection);
                    deleted += mongo.remove(query, collection).getDeletedCount();
                }
                for (String collection : collections) {
                    if (mongo.count(deletionQuery(collection), collection) != 0)
                        throw new IllegalStateException("Collection is not empty");
                }
            } catch (RuntimeException failure) {
                throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,
                        "Cleanup did not finish. Some data may already be deleted. Admin accounts were excluded. Check database access before retrying.");
            }
            return new Result(deleted, preserved);
        } finally { DatabaseMaintenanceGate.LOCK.writeLock().unlock(); }
    }
    static Query deletionQuery(String collection) {
        return "users".equals(collection) ? Query.query(Criteria.where("role").ne("ADMIN")) : new Query();
    }
}
