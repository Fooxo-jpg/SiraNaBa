package com.siranaba.backend.dto;

/** Pay the balance with a saved method (paymentMethodId) or a one-off channel (type + provider). */
public record PayRequest(String paymentMethodId, String type, String provider) {
}
