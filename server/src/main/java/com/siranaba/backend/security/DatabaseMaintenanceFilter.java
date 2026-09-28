package com.siranaba.backend.security;

import com.siranaba.backend.service.DatabaseMaintenanceGate;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
public class DatabaseMaintenanceFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        // Cleanup acquires the exclusive lock in its service after validating the request.
        if ("/api/admin/system/database/clean".equals(request.getServletPath())) {
            chain.doFilter(request, response);
            return;
        }
        DatabaseMaintenanceGate.LOCK.readLock().lock();
        try { chain.doFilter(request, response); }
        finally { DatabaseMaintenanceGate.LOCK.readLock().unlock(); }
    }
}
