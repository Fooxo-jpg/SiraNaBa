package com.siranaba.backend.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class TenantRegistrationPasswordTest {
    @Test void initialPasswordsUseRandomPrefixNameInitialsAndUnit() {
        String first = TenantRegistrationService.initialPassword("Dwane Valencia", "205");
        String second = TenantRegistrationService.initialPassword("Dwane Valencia", "205");
        assertTrue(first.matches("[0-9a-z]{4}DV205"));
        assertNotEquals(first, second);
    }
}
