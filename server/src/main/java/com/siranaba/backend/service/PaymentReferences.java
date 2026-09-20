package com.siranaba.backend.service;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

/** Payment reference codes, e.g. SNB-20260920-K7M2QX (date is Philippine time). */
public final class PaymentReferences {

    private static final ZoneId MANILA = ZoneId.of("Asia/Manila");
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("yyyyMMdd");
    private static final String CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
    private static final SecureRandom RANDOM = new SecureRandom();

    private PaymentReferences() {
    }

    public static String next(Instant at) {
        StringBuilder sb = new StringBuilder("SNB-").append(DAY.format(at.atZone(MANILA))).append('-');
        for (int i = 0; i < 6; i++) {
            sb.append(CHARS.charAt(RANDOM.nextInt(CHARS.length())));
        }
        return sb.toString();
    }
}
