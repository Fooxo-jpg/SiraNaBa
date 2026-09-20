package com.siranaba.backend.service;

import com.siranaba.backend.dto.LoginRequest;
import com.siranaba.backend.dto.LoginResponse;
import com.siranaba.backend.exception.ApiException;
import com.siranaba.backend.model.User;
import com.siranaba.backend.repository.UserRepository;
import com.siranaba.backend.security.CookieUtil;
import com.siranaba.backend.security.JwtService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final CookieUtil cookieUtil;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder,
                        JwtService jwtService, CookieUtil cookieUtil) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.cookieUtil = cookieUtil;
    }

    public LoginResponse login(LoginRequest request, HttpServletResponse response) {
        User user = userRepository.findByEmailIgnoreCase(request.email())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password."));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password.");
        }

        boolean rememberMe = request.rememberMe();
        String token = jwtService.generateToken(user.getId(), user.getEmail(), user.getTenantId(), rememberMe);
        cookieUtil.writeAuthCookie(response, token, rememberMe);

        return new LoginResponse(token, user.getEmail(), user.getRole());
    }

    public void logout(HttpServletResponse response) {
        cookieUtil.clearAuthCookie(response);
    }
}
