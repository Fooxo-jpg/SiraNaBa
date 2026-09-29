package com.siranaba.backend.dto;

import java.time.Instant;
import java.util.List;

/**
 * Overview of the audit_logs collection for the export dialog.
 * total = every log ever written; matching = how many fit the filters currently chosen.
 */
public record AuditLogSummaryResponse(long total, long matching, Instant first, Instant last, List<String> tags) {}
