package com.siranaba.backend.repository;

import com.siranaba.backend.model.FacilityMaintenanceSchedule;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;
import java.util.List;

public interface FacilityMaintenanceScheduleRepository extends MongoRepository<FacilityMaintenanceSchedule, String> {
    List<FacilityMaintenanceSchedule> findByStatusAndScheduledAtAfterOrderByScheduledAtAsc(String status, Instant after);
}
