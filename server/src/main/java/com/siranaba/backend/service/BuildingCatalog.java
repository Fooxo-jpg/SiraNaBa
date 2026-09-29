package com.siranaba.backend.service;

import com.siranaba.backend.exception.ApiException;
import org.springframework.http.HttpStatus;

import java.util.List;

/** Authoritative server-side layout for the single SiraNaBa building. */
public final class BuildingCatalog {
    public static final int BUILDING_ID = 1;
    public static final int FIRST_RESIDENTIAL_FLOOR = 2;
    public static final int LAST_RESIDENTIAL_FLOOR = 12;
    public static final int ROOMS_PER_FLOOR = 10;

    private BuildingCatalog() {}

    public record Room(String id, int building, int floor, int index, String unit, String type) {}

    public static Room requireRoom(String roomId, int building, String unit, String type) {
        Room room = parse(roomId);
        if (room == null || building != BUILDING_ID || room.building() != building
                || !room.unit().equals(unit == null ? "" : unit.toUpperCase())
                || !room.type().equals(type)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Choose a valid room and unit type from the building map.");
        }
        return room;
    }

    public static Room requireUnit(String unit) {
        String normalized = unit == null ? "" : unit.trim().toUpperCase();
        if (!normalized.matches("([2-9]|1[0-2])(0[1-9]|10)"))
            throw new ApiException(HttpStatus.BAD_REQUEST, "Unit must be a residential room on Floors 2 through 12.");
        int index = Integer.parseInt(normalized.substring(normalized.length() - 2));
        int floor = Integer.parseInt(normalized.substring(0, normalized.length() - 2));
        return parse("T1-" + String.format("%02d", floor) + "-" + String.format("%02d", index));
    }

    public static Room requireRoomId(String roomId) {
        Room room = parse(roomId);
        if (room == null) throw new ApiException(HttpStatus.BAD_REQUEST, "Choose valid residential rooms from the building map.");
        return room;
    }

    public static List<String> roomIdsForFloor(String floorId) {
        if (floorId == null || !floorId.matches("T1-(0[2-9]|1[0-2])"))
            throw new ApiException(HttpStatus.BAD_REQUEST, "Choose valid residential floors from the building map.");
        return java.util.stream.IntStream.rangeClosed(1, 10)
                .mapToObj(index -> floorId + "-" + String.format("%02d", index))
                .toList();
    }

    static Room parse(String roomId) {
        if (roomId == null || !roomId.matches("T1-(0[2-9]|1[0-2])-(0[1-9]|10)")) return null;
        String[] parts = roomId.split("-");
        int floor = Integer.parseInt(parts[1]), index = Integer.parseInt(parts[2]);
        String unit = floor + String.format("%02d", index);
        String type = index <= 4 ? "Studio" : index <= 8 ? "One-Bedroom" : "Two-Bedroom";
        return new Room(roomId, BUILDING_ID, floor, index, unit, type);
    }
}
