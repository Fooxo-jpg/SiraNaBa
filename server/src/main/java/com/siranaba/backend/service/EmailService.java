package com.siranaba.backend.service;

import com.siranaba.backend.config.AppProperties;
import com.siranaba.backend.model.Tenant;
import com.siranaba.backend.model.Billing;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    /** Result of a send attempt, so the admin UI can tell the admin what happened. */
    public record SendResult(boolean sent, String message) {
    }

    private final ObjectProvider<JavaMailSender> mailSender;
    private final AppProperties appProperties;

    private final String mailHost;

    public EmailService(ObjectProvider<JavaMailSender> mailSender, AppProperties appProperties,
                        @Value("${spring.mail.host:}") String mailHost) {
        this.mailSender = mailSender;
        this.appProperties = appProperties;
        this.mailHost = mailHost;
    }

    public SendResult sendWelcome(Tenant tenant, String password) {
        JavaMailSender sender = mailSender.getIfAvailable();
        // Spring may still create a sender when MAIL_HOST is set to an empty string.
        if (sender == null || mailHost == null || mailHost.isBlank()) {
            log.warn("Mail is not configured (MAIL_HOST is empty); welcome email to {} was not sent.", tenant.getEmail());
            return new SendResult(false, "Email is not configured on the server (set MAIL_HOST in server/.env). The account was created.");
        }

        String leaseStart = LocalDate.parse(tenant.getLeaseStart())
                .format(DateTimeFormatter.ofPattern("MMMM d, yyyy", Locale.ENGLISH));

        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setFrom(appProperties.getMail().getFrom());
        msg.setTo(tenant.getEmail());
        msg.setSubject("Your SiraNaBa tenant account");
        msg.setText("""
                Hello %s,

                Welcome to SiraNaBa! Your tenant account is ready.

                Your unit
                  Main Building, Unit %s (%s)
                  Lease starts: %s
                  Monthly rent: PHP %s

                Sign in
                  %s
                  Email:    %s
                  Password: %s

                Please change your password after you sign in for the first time.

                If you weren't expecting this email, please contact the building office.

                - SiraNaBa Facility Management
                """.formatted(
                tenant.getFirstName().isBlank() ? tenant.getLastName() : tenant.getFirstName(),
                tenant.getUnit(), tenant.getUnitType(),
                leaseStart,
                String.format(Locale.ENGLISH, "%,.2f", tenant.getMonthlyRent()),
                appProperties.getPortalUrl(),
                tenant.getEmail(),
                password));

        try {
            sender.send(msg);
            return new SendResult(true, "Login details emailed to " + tenant.getEmail() + ".");
        } catch (Exception ex) {
            // Never log the message body: it contains the password.
            log.error("Failed to send welcome email to {}: {}", tenant.getEmail(), ex.getMessage());
            return new SendResult(false, "The account was created but the email could not be sent. Check the server's mail settings.");
        }
    }

    public SendResult sendRentInvoice(Tenant tenant, Billing.RentObligation rent, int noticeDays) {
        JavaMailSender sender = mailSender.getIfAvailable();
        if (sender == null || mailHost == null || mailHost.isBlank()) {
            log.warn("Mail is not configured; rent invoice to {} will be retried.", tenant.getEmail());
            return new SendResult(false, "Email is not configured on the server.");
        }
        String due = LocalDate.parse(rent.getDueDate()).format(DateTimeFormatter.ofPattern("MMMM d, yyyy", Locale.ENGLISH));
        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setFrom(appProperties.getMail().getFrom());
        msg.setTo(tenant.getEmail());
        msg.setSubject("SiraNaBa rent invoice - due " + due);
        msg.setText("""
                Hello %s,

                Your rent invoice is ready.

                Billing period: %s
                Amount due: PHP %s
                Due date: %s

                View your invoice and payment options: %s/billing

                This notice was sent %d days before the due date.

                - SiraNaBa Facility Management
                """.formatted(tenant.getFirstName().isBlank() ? tenant.getLastName() : tenant.getFirstName(),
                rent.getBillingPeriod(), String.format(Locale.ENGLISH, "%,.2f", rent.getBalance()), due,
                appProperties.getPortalUrl().replaceAll("/$", ""), noticeDays));
        try {
            sender.send(msg);
            return new SendResult(true, "Rent invoice emailed to " + tenant.getEmail() + ".");
        } catch (Exception ex) {
            log.error("Failed to send rent invoice to {}: {}", tenant.getEmail(), ex.getMessage());
            return new SendResult(false, "The rent invoice email could not be sent and will be retried.");
        }
    }
}
