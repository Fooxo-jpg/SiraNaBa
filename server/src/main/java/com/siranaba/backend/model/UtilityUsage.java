package com.siranaba.backend.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UtilityUsage {
    private String cycleLabel;
    private UsageMetric electricity;
    private UsageMetric water;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UsageMetric {
        private double used;
        private double limit;
        private String unit;
        /** Only meaningful for electricity; null is fine for water. */
        private Integer deltaVsNeighbors;
    }
}
