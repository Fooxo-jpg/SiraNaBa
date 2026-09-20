package com.siranaba.backend.dto;

/** One row of the admin portal's Staff Management table. */
public record StaffResponse(
        String id,
        /** Registry ID, e.g. "ST-201". */
        String staffCode,
        String name,
        String specialty,
        /** online | away | offline */
        String availability,
        int workload,
        int tickets,
        String email,
        String phone
) {
}
