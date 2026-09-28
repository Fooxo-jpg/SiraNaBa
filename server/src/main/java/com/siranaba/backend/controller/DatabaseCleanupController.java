package com.siranaba.backend.controller;

import com.siranaba.backend.security.JwtAuthenticationFilter.AuthenticatedUser;
import com.siranaba.backend.service.DatabaseCleanupService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/system/database")
public class DatabaseCleanupController {
    private final DatabaseCleanupService service;
    public DatabaseCleanupController(DatabaseCleanupService service) { this.service = service; }
    public record Request(@NotBlank String password, @NotBlank String confirmation, @NotBlank String database) {}
    @PostMapping("/clean")
    public DatabaseCleanupService.Result clean(@AuthenticationPrincipal AuthenticatedUser user, @Valid @RequestBody Request request) {
        return service.clean(user.userId(), request.password(), request.confirmation(), request.database());
    }
}
