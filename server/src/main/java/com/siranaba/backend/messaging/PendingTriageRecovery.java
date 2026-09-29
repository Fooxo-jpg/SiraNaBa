package com.siranaba.backend.messaging;

import com.siranaba.backend.repository.TicketRepository;
import com.siranaba.backend.service.TicketTriageQueue;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.rabbitmq.enabled", havingValue = "true")
public class PendingTriageRecovery {
    private final TicketRepository tickets;
    private final RabbitTicketTriagePublisher publisher;

    public PendingTriageRecovery(TicketRepository tickets, RabbitTicketTriagePublisher publisher) {
        this.tickets = tickets;
        this.publisher = publisher;
    }

    @Scheduled(fixedDelayString = "${app.rabbitmq.recovery-delay-ms:30000}", initialDelay = 30000)
    public void republishOldestPendingTicket() {
        tickets.findFirstByPriorityOrderBySubmittedAtAsc(TicketTriageQueue.QUEUED_PRIORITY)
                .ifPresent(ticket -> publisher.publish(ticket.getId()));
    }
}
