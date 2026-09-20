package com.siranaba.backend.repository;

import com.siranaba.backend.model.Tenant;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface TenantRepository extends MongoRepository<Tenant, String> {
    boolean existsByRoomId(String roomId);
}
