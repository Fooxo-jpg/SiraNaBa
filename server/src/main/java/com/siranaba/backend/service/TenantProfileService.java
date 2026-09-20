package com.siranaba.backend.service;

import com.siranaba.backend.dto.UpdateTenantProfileRequest;
import com.siranaba.backend.exception.ApiException;
import com.siranaba.backend.model.Tenant;
import com.siranaba.backend.repository.TenantRepository;
import com.siranaba.backend.repository.UserRepository;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.Locale;

/**
 * The one place a tenant's name / email / phone gets written. Both the tenant's
 * Account Settings page (via DashboardService) and the admin portal's Tenant
 * Management (via AdminTenantService) go through here, so an edit from either
 * side follows exactly the same rules and updates the same records:
 * the tenant document, and the login (User.email) that goes with it.
 */
@Service
public class TenantProfileService {

    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;

    public TenantProfileService(TenantRepository tenantRepository, UserRepository userRepository) {
        this.tenantRepository = tenantRepository;
        this.userRepository = userRepository;
    }

    public Tenant update(Tenant tenant, UpdateTenantProfileRequest request) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);

        // Emails are unique across all logins (admin's included). This tenant's
        // own login is the only match that's allowed. Null-safe on purpose: the
        // admin login has no tenantId.
        userRepository.findByEmailIgnoreCase(email)
                .filter(u -> !tenant.getId().equals(u.getTenantId()))
                .ifPresent(u -> {
                    throw new ApiException(HttpStatus.CONFLICT, "An account with this email already exists.");
                });

        // Login first, so a duplicate-email race fails before the tenant record
        // is touched and the two can't end up disagreeing.
        try {
            userRepository.findByTenantId(tenant.getId()).ifPresent(user -> {
                if (!email.equals(user.getEmail())) {
                    user.setEmail(email);
                    userRepository.save(user);
                }
            });
        } catch (DuplicateKeyException ex) {
            throw new ApiException(HttpStatus.CONFLICT, "An account with this email already exists.");
        }

        tenant.setFirstName(request.firstName().trim());
        tenant.setLastName(request.lastName().trim());
        tenant.setEmail(email);
        tenant.setPhone(request.phone() == null || request.phone().isBlank() ? null : request.phone().trim());
        return tenantRepository.save(tenant);
    }
}
