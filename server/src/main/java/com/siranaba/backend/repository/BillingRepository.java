package com.siranaba.backend.repository;

import com.siranaba.backend.model.Billing;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface BillingRepository extends MongoRepository<Billing, String> {
    Optional<Billing> findByTenantId(String tenantId);
}
