package com.siranaba.backend.security;

import com.siranaba.backend.config.AppProperties;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

@Component
public class CookieUtil {

    private final AppProperties appProperties;

    public CookieUtil(AppProperties appProperties) {
        this.appProperties = appProperties;
    }

    /**
     * @param rememberMe true  -> persistent cookie that survives closing the browser (30 days)
     *                   false -> session cookie, dropped when the browser closes
     */
    public void writeAuthCookie(HttpServletResponse response, String token, boolean rememberMe) {
        ResponseCookie cookie = ResponseCookie.from(appProperties.getJwt().getCookieName(), token)
                .httpOnly(true)
                .secure(true)                 // required for SameSite=None to be honored
                .sameSite("None")             // required for a cross-subdomain frontend/backend
                .path("/")
                .maxAge(rememberMe ? JwtService.REMEMBER_ME_MINUTES * 60 : -1)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    public void clearAuthCookie(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from(appProperties.getJwt().getCookieName(), "")
                .httpOnly(true)
                .secure(true)
                .sameSite("None")
                .path("/")
                .maxAge(0)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    public String readAuthCookie(HttpServletRequest request) {
        if (request.getCookies() == null) return null;
        String cookieName = appProperties.getJwt().getCookieName();
        for (var cookie : request.getCookies()) {
            if (cookieName.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }
}