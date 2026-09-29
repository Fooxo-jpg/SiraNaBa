package com.siranaba.backend.service;

import com.siranaba.backend.exception.ApiException;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class BuildingCatalogTest {
    @Test void acceptsAllEdgesOfTheResidentialLayout() {
        var first = BuildingCatalog.requireRoom("T1-02-01", 1, "201", "Studio");
        var last = BuildingCatalog.requireRoom("T1-12-10", 1, "1210", "Two-Bedroom");
        assertEquals(2, first.floor()); assertEquals(12, last.floor());
        assertEquals("One-Bedroom", BuildingCatalog.requireUnit("1205").type());
    }

    @Test void rejectsLobbyServiceLevelsOldTowersAndPenthouseData() {
        assertThrows(ApiException.class, () -> BuildingCatalog.requireUnit("101"));
        assertThrows(ApiException.class, () -> BuildingCatalog.requireUnit("PH12"));
        assertThrows(ApiException.class, () -> BuildingCatalog.requireRoom("T2-04-01", 2, "401", "Studio"));
        assertThrows(ApiException.class, () -> BuildingCatalog.requireRoom("T1-13-01", 1, "1301", "Studio"));
        assertThrows(ApiException.class, () -> BuildingCatalog.requireRoom("T1-04-01", 1, "401", "Two-Bedroom"));
    }
}
