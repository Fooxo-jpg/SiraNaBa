package com.siranaba.backend.repository;

import com.siranaba.backend.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByEmailIgnoreCase(String email);

    Optional<User> findByTenantId(String tenantId);

    boolean existsByTenantId(String tenantId);

    void deleteByTenantId(String tenantId);
}
