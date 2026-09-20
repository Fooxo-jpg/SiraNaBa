package com.siranaba.backend.repository;

import com.siranaba.backend.model.NotificationDoc;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface NotificationRepository extends MongoRepository<NotificationDoc, String> {
    List<NotificationDoc> findByTenantIdOrderByTimestampDesc(String tenantId);

    void deleteByTenantId(String tenantId);
}
