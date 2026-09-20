package com.siranaba.backend.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Specialist {
    private String name;
    private String title;
    private double rating;
    private int reviewCount;
    private String eta;
    private String status;
    private String phone;

    public static Specialist unassigned() {
        return new Specialist("Unassigned", "", 0, 0, null, "Not started", null);
    }
}
