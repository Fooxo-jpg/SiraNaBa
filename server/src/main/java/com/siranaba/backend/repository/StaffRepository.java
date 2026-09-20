package com.siranaba.backend.repository;

import com.siranaba.backend.model.Staff;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface StaffRepository extends MongoRepository<Staff, String> {
}
