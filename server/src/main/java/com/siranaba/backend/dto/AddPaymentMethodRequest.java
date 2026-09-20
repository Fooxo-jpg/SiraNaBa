package com.siranaba.backend.dto;

/**
 * Add a payment method. Which fields matter depends on {@code type}:
 * CARD (cardNumber, expiry, accountName), EWALLET (provider, mobileNumber),
 * BANK (provider, accountNumber, accountName). The CVV is never sent to the server.
 */
public record AddPaymentMethodRequest(
        String type,
        String provider,
        String accountName,
        String cardNumber,
        String expiry,
        String mobileNumber,
        String accountNumber,
        Boolean setAsPrimary
) {
}
