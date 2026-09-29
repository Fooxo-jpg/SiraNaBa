package com.siranaba.backend.controller;

import com.siranaba.backend.service.TestDataService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/system/test-data")
public class TestDataController {
    private final TestDataService service;
    public TestDataController(TestDataService service) { this.service = service; }
    @PostMapping public TestDataService.Result generate(@RequestBody TestDataService.Request request) { return service.generate(request); }
}
