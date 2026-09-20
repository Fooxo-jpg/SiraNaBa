package com.siranaba.backend.dto;

/**
 * Partial update: every field is optional, only the ones supplied are
 * applied (e.g. the admin's "Mark Online/Offline" action only sends
 * availability).
 */
public record UpdateStaffRequest(
        String name,
        String specialty,
        /** online | away | offline */
        String availability,
        Integer workload,
        Integer tickets,
        String phone
) {
}
