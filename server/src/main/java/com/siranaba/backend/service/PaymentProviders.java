package com.siranaba.backend.service;

import java.util.List;

/**
 * Supported payment channels. Keep in sync with PAYMENT_PROVIDERS in the front
 * end's src/pages/Billing.jsx (which only displays them; the server validates).
 */
public final class PaymentProviders {

    public static final List<String> EWALLETS = List.of("GCash", "Maya");

    public static final List<String> BANKS = List.of(
            "BDO", "BPI", "RCBC", "Metrobank", "UnionBank", "Landbank",
            "PNB", "Security Bank", "China Bank", "EastWest Bank");

    private PaymentProviders() {
    }
}
