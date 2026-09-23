package com.siranaba.backend.repository;

import com.siranaba.backend.model.AuditLog;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface AuditLogRepository extends MongoRepository<AuditLog, String> {
    List<AuditLog> findTop200ByOrderByTimestampDesc();
}