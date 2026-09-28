package com.siranaba.backend.model;

/** Numeric unit suffixes identify the room; preceding digits identify the floor. */
public final class UnitFloor {
    private UnitFloor() {}

    public static String fromUnit(String unit) {
        if (unit == null) return null;
        String value = unit.trim().toUpperCase(java.util.Locale.ROOT);
        String floor;
        if (value.matches("[0-9]{3,}")) floor = value.substring(0, value.length() - 2);
        else if (value.matches("PH[0-9]+(?:-[0-9]+)?")) floor = value.substring(2).split("-")[0];
        else return null;
        floor = floor.replaceFirst("^0+", "");
        return floor.isEmpty() ? null : floor;
    }
}
