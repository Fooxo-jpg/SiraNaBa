package com.siranaba.backend.service;

import com.siranaba.backend.model.Tenant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class WelcomeEmailDispatcher {
    private static final Logger log = LoggerFactory.getLogger(WelcomeEmailDispatcher.class);
    private final EmailService emailService;

    public WelcomeEmailDispatcher(EmailService emailService) {
        this.emailService = emailService;
    }

    @Async
    public void send(Tenant tenant, String temporaryPassword) {
        EmailService.SendResult result = emailService.sendWelcome(tenant, temporaryPassword);
        if (!result.sent()) log.warn("Welcome email for tenant {} was not delivered: {}", tenant.getId(), result.message());
    }
}
