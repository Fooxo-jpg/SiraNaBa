package com.siranaba.backend.messaging;

import com.siranaba.backend.service.TicketTriagePublisher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.rabbitmq.enabled", havingValue = "true")
public class RabbitTicketTriagePublisher implements TicketTriagePublisher {
    private static final Logger log = LoggerFactory.getLogger(RabbitTicketTriagePublisher.class);
    private final RabbitTemplate rabbitTemplate;

    public RabbitTicketTriagePublisher(RabbitTemplate rabbitTemplate) { this.rabbitTemplate = rabbitTemplate; }

    @Override public void publish(String ticketId) {
        try {
            rabbitTemplate.convertAndSend(RabbitMqConfig.TRIAGE_EXCHANGE, RabbitMqConfig.TRIAGE_ROUTING_KEY,
                    new TicketTriageMessage(ticketId));
        } catch (AmqpException ex) {
            // Ticket creation must stay fast; the recovery publisher finds this durable Mongo record later.
            log.error("Could not enqueue ticket {} for triage; recovery will retry: {}", ticketId, ex.getMessage());
        }
    }
}
