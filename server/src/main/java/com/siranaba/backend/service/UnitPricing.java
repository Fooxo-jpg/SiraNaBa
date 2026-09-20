package com.siranaba.backend.service;

import com.siranaba.backend.exception.ApiException;
import org.springframework.http.HttpStatus;

import java.util.Map;

/**
 * Monthly rent in PHP per unit type. Keep in sync with RENT_BY_TYPE in the front
 * end's src/data/buildingData.js (which only displays these; the server is the
 * one that decides what a tenant is charged).
 */
public final class UnitPricing {

    private static final Map<String, Double> RENT_BY_TYPE = Map.of(
            "Studio", 15000.0,
            "One-Bedroom", 25000.0,
            "Two-Bedroom", 40000.0,
            "Penthouse", 120000.0
    );

    private UnitPricing() {
    }

    public static double monthlyRent(String unitType) {
        Double rent = RENT_BY_TYPE.get(unitType);
        if (rent == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Unknown unit type: " + unitType);
        }
        return rent;
    }
}
