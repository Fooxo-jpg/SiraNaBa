package com.siranaba.backend.controller;

import com.siranaba.backend.dto.LoginRequest;
import com.siranaba.backend.dto.LoginResponse;
import com.siranaba.backend.dto.MeResponse;
import com.siranaba.backend.exception.ApiException;
import com.siranaba.backend.security.JwtAuthenticationFilter.AuthenticatedUser;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import com.siranaba.backend.service.AuthService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request, HttpServletResponse response) {
        return authService.login(request, response);
    }

    /** Who is signed in right now? The front end uses the role to pick the tenant or admin side. */
    @GetMapping("/me")
    public MeResponse me() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof AuthenticatedUser user) {
            return new MeResponse(user.email(), user.role());
        }
        throw new ApiException(HttpStatus.UNAUTHORIZED, "You need to sign in to do that.");
    }

    @PostMapping("/logout")
    public void logout(HttpServletResponse response) {
        authService.logout(response);
    }
}
