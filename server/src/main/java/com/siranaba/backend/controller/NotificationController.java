package com.siranaba.backend.controller;

import com.siranaba.backend.model.NotificationDoc;
import com.siranaba.backend.service.NotificationService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public List<NotificationDoc> list() {
        return notificationService.list();
    }

    @PostMapping("/mark-all-read")
    public List<NotificationDoc> markAllRead() {
        return notificationService.markAllRead();
    }

    @PatchMapping("/{id}/read")
    public NotificationDoc markRead(@PathVariable String id) {
        return notificationService.markRead(id);
    }
}
