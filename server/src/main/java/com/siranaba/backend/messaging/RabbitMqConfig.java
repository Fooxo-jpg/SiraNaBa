package com.siranaba.backend.messaging;

import org.springframework.amqp.core.*;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConditionalOnProperty(name = "app.rabbitmq.enabled", havingValue = "true")
public class RabbitMqConfig {
    public static final String TRIAGE_EXCHANGE = "siranaba.ticket";
    public static final String TRIAGE_QUEUE = "siranaba.ticket.triage";
    public static final String TRIAGE_ROUTING_KEY = "ticket.triage";
    public static final String DEAD_LETTER_EXCHANGE = "siranaba.dead-letter";
    public static final String DEAD_LETTER_QUEUE = "siranaba.ticket.triage.dead";

    @Bean DirectExchange triageExchange() { return new DirectExchange(TRIAGE_EXCHANGE, true, false); }
    @Bean DirectExchange deadLetterExchange() { return new DirectExchange(DEAD_LETTER_EXCHANGE, true, false); }
    @Bean Queue triageQueue() {
        return QueueBuilder.durable(TRIAGE_QUEUE).deadLetterExchange(DEAD_LETTER_EXCHANGE)
                .deadLetterRoutingKey(TRIAGE_ROUTING_KEY).build();
    }
    @Bean Queue deadLetterQueue() { return QueueBuilder.durable(DEAD_LETTER_QUEUE).build(); }
    @Bean Binding triageBinding(Queue triageQueue, DirectExchange triageExchange) {
        return BindingBuilder.bind(triageQueue).to(triageExchange).with(TRIAGE_ROUTING_KEY);
    }
    @Bean Binding deadLetterBinding(Queue deadLetterQueue, DirectExchange deadLetterExchange) {
        return BindingBuilder.bind(deadLetterQueue).to(deadLetterExchange).with(TRIAGE_ROUTING_KEY);
    }
    @Bean Jackson2JsonMessageConverter rabbitJsonConverter() { return new Jackson2JsonMessageConverter(); }
}
