package com.siranaba.backend.dto;

/**
 * One row of the admin portal's Tenant Management table, built from the same
 * Tenant document the tenant portal reads. `occupancy`, `payment` and `account`
 * are derived (from lease start, balance and due date), never stored, so they
 * can't drift out of step with the tenant's own data.
 */
public record AdminTenantResponse(
        String id,
        /** Registry ID, e.g. "T-0007". */
        String code,
        String firstName,
        String lastName,
        String name,
        String email,
        String phone,
        String roomId,
        int tower,
        String building,
        String unit,
        String unitType,
        String leaseStart,
        double monthlyRent,
        String dueDate,
        double currentBalance,
        /** Active | Scheduled */
        String occupancy,
        /** Paid | Pending | Overdue */
        String payment,
        /** Good Standing | Delinquent */
        String account
) {
}
