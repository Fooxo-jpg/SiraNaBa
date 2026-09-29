package com.siranaba.backend.service;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/** The scheduled local worker discovers pending tickets, so no explicit publish is needed. */
@Component
@ConditionalOnProperty(name = "app.rabbitmq.enabled", havingValue = "false", matchIfMissing = true)
public class LocalTicketTriagePublisher implements TicketTriagePublisher {
    @Override public void publish(String ticketId) { }
}
