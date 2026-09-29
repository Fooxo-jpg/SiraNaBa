package com.siranaba.backend.messaging;

import com.siranaba.backend.model.Ticket;
import com.siranaba.backend.repository.TicketRepository;
import com.siranaba.backend.service.RabbitTicketTriageProcessor;
import com.siranaba.backend.service.TicketTriageQueue;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.rabbitmq.enabled", havingValue = "true")
public class RabbitTicketTriageConsumer {
    private final TicketRepository tickets;
    private final RabbitTicketTriageProcessor processor;

    public RabbitTicketTriageConsumer(TicketRepository tickets, RabbitTicketTriageProcessor processor) {
        this.tickets = tickets;
        this.processor = processor;
    }

    @RabbitListener(queues = RabbitMqConfig.TRIAGE_QUEUE, concurrency = "1")
    public void consume(TicketTriageMessage message) {
        Ticket ticket = tickets.findById(message.ticketId()).orElse(null);
        if (ticket == null || !TicketTriageQueue.QUEUED_PRIORITY.equals(ticket.getPriority())) return;
        processor.process(ticket);
    }
}
