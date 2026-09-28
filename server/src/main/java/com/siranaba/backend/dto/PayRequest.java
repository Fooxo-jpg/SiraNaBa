package com.siranaba.backend.dto;
import java.math.BigDecimal;
public record PayRequest(String paymentMethodId, String type, String provider, BigDecimal amount,
                         String paymentType, String idempotencyKey, String relatedUtilityStatementId) {}
