package com.siranaba.backend.security;

import com.siranaba.backend.config.AppProperties;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
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
        Cookie cookie = new Cookie(appProperties.getJwt().getCookieName(), token);
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(rememberMe ? (int) (JwtService.REMEMBER_ME_MINUTES * 60) : -1);
        // Secure should be true in production (HTTPS). Left false here so the
        // cookie still works over plain http://localhost during development.
        cookie.setSecure(false);
        response.addCookie(cookie);
    }

    public void clearAuthCookie(HttpServletResponse response) {
        Cookie cookie = new Cookie(appProperties.getJwt().getCookieName(), "");
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(0);
        response.addCookie(cookie);
    }

    public String readAuthCookie(HttpServletRequest request) {
        if (request.getCookies() == null) return null;
        String cookieName = appProperties.getJwt().getCookieName();
        for (Cookie cookie : request.getCookies()) {
            if (cookieName.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }
}
