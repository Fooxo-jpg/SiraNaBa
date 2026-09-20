package com.siranaba.backend.controller;

import com.siranaba.backend.dto.DatabaseStatusResponse;
import com.siranaba.backend.service.DatabaseStatusService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Admin-only (enforced in SecurityConfig: /api/admin/** requires the ADMIN role). */
@RestController
@RequestMapping("/api/admin/system")
public class AdminSystemController {

    private final DatabaseStatusService databaseStatusService;

    public AdminSystemController(DatabaseStatusService databaseStatusService) {
        this.databaseStatusService = databaseStatusService;
    }

    /** Admin > Configuration: live MongoDB connection, version, sizes and collections. */
    @GetMapping("/database")
    public DatabaseStatusResponse database() {
        return databaseStatusService.check();
    }
}
