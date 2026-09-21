package com.siranaba.backend.repository;

import com.siranaba.backend.model.Staff;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface StaffRepository extends MongoRepository<Staff, String> {
    Optional<Staff> findFirstByNameIgnoreCase(String name);
}
