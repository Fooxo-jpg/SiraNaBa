package com.siranaba.backend.service;

import com.siranaba.backend.exception.ResourceNotFoundException;
import com.siranaba.backend.model.NotificationDoc;
import com.siranaba.backend.repository.NotificationRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final TenantContext tenantContext;

    public NotificationService(NotificationRepository notificationRepository, TenantContext tenantContext) {
        this.notificationRepository = notificationRepository;
        this.tenantContext = tenantContext;
    }

    public List<NotificationDoc> list() {
        return notificationRepository.findByTenantIdOrderByTimestampDesc(tenantContext.currentTenantId());
    }

    public List<NotificationDoc> markAllRead() {
        List<NotificationDoc> notifications = list();
        notifications.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(notifications);
        return notifications;
    }

    public NotificationDoc markRead(String id) {
        String tenantId = tenantContext.currentTenantId();
        NotificationDoc notification = notificationRepository.findById(id)
                .filter(n -> n.getTenantId().equals(tenantId))
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found."));
        notification.setRead(true);
        return notificationRepository.save(notification);
    }
}
