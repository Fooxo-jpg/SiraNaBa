package com.siranaba.backend.controller;

import com.siranaba.backend.service.CommandCenterService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class CommandCenterController {
    private final CommandCenterService service;
    public CommandCenterController(CommandCenterService service) { this.service = service; }
    @GetMapping("/api/admin/command-center")
    public CommandCenterService.Metrics metrics() { return service.metrics(); }
}
