package com.siranaba.backend.controller;

import com.siranaba.backend.dto.DatabaseStatusResponse;
import com.siranaba.backend.model.AuditLog;
import com.siranaba.backend.repository.AuditLogRepository;
import com.siranaba.backend.service.DatabaseStatusService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/system")
public class AdminSystemController {

    private final DatabaseStatusService databaseStatusService;
    private final AuditLogRepository auditLogRepository;

    public AdminSystemController(DatabaseStatusService databaseStatusService, AuditLogRepository auditLogRepository) {
        this.databaseStatusService = databaseStatusService;
        this.auditLogRepository = auditLogRepository;
    }

    @GetMapping("/database")
    public DatabaseStatusResponse database() {
        return databaseStatusService.check();
    }

    /** Admin > Configuration > System Logs tab. */
    @GetMapping("/logs")
    public List<AuditLog> logs() {
        return auditLogRepository.findTop200ByOrderByTimestampDesc();
    }
}