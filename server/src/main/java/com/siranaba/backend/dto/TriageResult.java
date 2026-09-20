package com.siranaba.backend.dto;

/**
 * @param priority One of Low | Medium | High | Critical (matches
 *                 StatusBadge.jsx's TONE_MAP keys on the front end).
 * @param safetyNote Empty string when there's no safety concern.
 * @param estimatedCompletion Short human string, e.g. "1-2 business days".
 */
public record TriageResult(String priority, String safetyNote, String estimatedCompletion) {

    public static TriageResult fallback() {
        return new TriageResult("Medium", "", "2-3 business days");
    }
}
