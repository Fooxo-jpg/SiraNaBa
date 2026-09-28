package com.siranaba.backend.service;

import com.siranaba.backend.bootstrap.DataSeeder;
import com.siranaba.backend.config.AppProperties;
import com.siranaba.backend.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import static org.mockito.Mockito.*;

class DatabaseCleanupSeederTest {
    @Test void cleanedDatabaseWithAdminsIsNotRepopulatedOnRestart() {
        var tenants = mock(TenantRepository.class);
        var users = mock(UserRepository.class);
        var billing = mock(BillingRepository.class);
        var notifications = mock(NotificationRepository.class);
        var encoder = mock(PasswordEncoder.class);
        var properties = mock(AppProperties.class, RETURNS_DEEP_STUBS);
        when(properties.getSeed().isEnabled()).thenReturn(true);
        when(users.existsByRole("ADMIN")).thenReturn(true);
        new DataSeeder(tenants, users, billing, notifications, encoder, properties).run();
        verify(tenants, never()).save(any());
        verify(users, never()).save(any());
        verifyNoInteractions(billing, notifications, encoder);
    }
}
