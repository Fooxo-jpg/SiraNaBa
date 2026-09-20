package com.siranaba.backend.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@NoArgsConstructor
@Document(collection = "staff")
public class Staff {

    @Id
    private String id;

    /**
     * Human-friendly registry ID shown in the admin portal, e.g. "ST-201".
     * Assigned by StaffService when the staff member is added.
     */
    private String staffCode;

    private String name;
    /** Electrician | Plumber | HVAC Specialist | General Repair | Cleaner */
    private String specialty;
    /** online | away | offline */
    private String availability = "offline";
    /** 0-100. Set by admin actions / dispatch, not user-supplied on create. */
    private int workload;
    /** Count of tickets currently assigned to this staff member. */
    private int tickets;
    private String email;
    private String phone;
}
