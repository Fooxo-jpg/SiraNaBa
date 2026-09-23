package com.siranaba.backend.repository;

import com.siranaba.backend.model.Ticket;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface TicketRepository extends MongoRepository<Ticket, String> {
    List<Ticket> findByTenantIdOrderBySubmittedAtDesc(String tenantId);
    Optional<Ticket> findByIdAndTenantId(String id, String tenantId);
    Optional<Ticket> findFirstByPriorityOrderBySubmittedAtAsc(String priority);
    List<Ticket> findAllByOrderBySubmittedAtAsc();
    long countByTenantIdAndStageNot(String tenantId, String stage);
    long countByTenantIdAndStageNotIn(String tenantId, java.util.Collection<String> stages);
}
