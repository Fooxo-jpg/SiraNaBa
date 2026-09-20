package com.siranaba.backend.service;

import com.siranaba.backend.exception.ApiException;
import com.siranaba.backend.model.Tenant;
import com.siranaba.backend.repository.TenantRepository;
import com.siranaba.backend.security.JwtAuthenticationFilter.AuthenticatedUser;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * Resolves the "current" tenant for a request from the authenticated
 * user's JWT (set by JwtAuthenticationFilter). Every route that uses this
 * is behind Spring Security's `.authenticated()` rule (see SecurityConfig),
 * so principal is guaranteed to be an AuthenticatedUser by the time a
 * controller method runs - the exception below is just a defensive
 * fallback and should never actually trigger.
 */
@Component
public class TenantContext {

    private final TenantRepository tenantRepository;

    public TenantContext(TenantRepository tenantRepository) {
        this.tenantRepository = tenantRepository;
    }

    public Tenant currentTenant() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof AuthenticatedUser authenticatedUser) {
            if (authenticatedUser.tenantId() == null) {
                throw new ApiException(HttpStatus.FORBIDDEN, "This account is not linked to a tenant.");
            }
            return tenantRepository.findById(authenticatedUser.tenantId())
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Tenant not found."));
        }
        throw new ApiException(HttpStatus.UNAUTHORIZED, "You need to sign in to do that.");
    }

    public String currentTenantId() {
        return currentTenant().getId();
    }
}
