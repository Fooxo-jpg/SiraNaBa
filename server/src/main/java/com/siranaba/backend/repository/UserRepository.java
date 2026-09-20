package com.siranaba.backend.repository;

import com.siranaba.backend.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByTenantId(String tenantId);
}
