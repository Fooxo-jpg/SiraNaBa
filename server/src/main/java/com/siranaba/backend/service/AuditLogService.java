package com.siranaba.backend.service;

import com.siranaba.backend.model.AuditLog;
import com.siranaba.backend.repository.AuditLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
public class AuditLogService {

    private static final Logger log = LoggerFactory.getLogger("AUDIT");

    private final AuditLogRepository auditLogRepository;

    public AuditLogService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    public void insert(String tag, String text) { record("INFO", "Insert", tag, text); }
    public void update(String tag, String text) { record("INFO", "Update", tag, text); }
    public void delete(String tag, String text) { record("WARN", "Delete", tag, text); }

    private void record(String level, String action, String tag, String text) {
        log.info("[{}] {} : {}", action, tag, text);
        auditLogRepository.save(new AuditLog(level, action, tag, text, Instant.now()));
    }
}