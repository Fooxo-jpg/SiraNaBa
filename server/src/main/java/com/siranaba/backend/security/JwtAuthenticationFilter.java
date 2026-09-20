package com.siranaba.backend.security;

import com.siranaba.backend.model.User;
import com.siranaba.backend.repository.UserRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

/**
 * Reads the httpOnly session cookie (if present) and, when it's a valid
 * token for a known user, authenticates the request as that user by
 * attaching an AuthenticatedUser principal. Requests without a cookie, or
 * with an invalid/expired one, simply proceed unauthenticated - endpoints
 * that require a tenant fall back to the single seeded demo tenant (see
 * TenantContext), matching this single-tenant demo's original mock
 * behaviour while leaving real auth fully wired for when you add
 * multi-tenant scoping and front-end route guards.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final CookieUtil cookieUtil;
    private final UserRepository userRepository;

    public JwtAuthenticationFilter(JwtService jwtService, CookieUtil cookieUtil, UserRepository userRepository) {
        this.jwtService = jwtService;
        this.cookieUtil = cookieUtil;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                     @NonNull HttpServletResponse response,
                                     @NonNull FilterChain filterChain) throws ServletException, IOException {
        String token = cookieUtil.readAuthCookie(request);

        if (token != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            try {
                Claims claims = jwtService.parseClaims(token);
                String userId = claims.getSubject();
                Optional<User> user = userRepository.findById(userId);
                user.ifPresent(u -> {
                    AuthenticatedUser principal = new AuthenticatedUser(u.getId(), u.getEmail(), u.getTenantId(), u.getRole());
                    var auth = new UsernamePasswordAuthenticationToken(
                            principal, null, List.of(new SimpleGrantedAuthority("ROLE_" + u.getRole())));
                    SecurityContextHolder.getContext().setAuthentication(auth);
                });
            } catch (JwtException | IllegalArgumentException ex) {
                // Invalid/expired token - proceed unauthenticated rather than
                // hard-failing, so a stale cookie doesn't lock the user out.
                SecurityContextHolder.clearContext();
            }
        }

        filterChain.doFilter(request, response);
    }

    public record AuthenticatedUser(String userId, String email, String tenantId, String role) {
    }
}
