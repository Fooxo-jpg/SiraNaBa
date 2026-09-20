package com.siranaba.backend.security;

import com.siranaba.backend.config.AppProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;

@Service
public class JwtService {

    private final AppProperties appProperties;

    public JwtService(AppProperties appProperties) {
        this.appProperties = appProperties;
    }

    private SecretKey signingKey() {
        String secret = appProperties.getJwt().getSecret();
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        // HS256 needs a key of at least 256 bits; pad defensively so a short
        // dev secret in .env.example doesn't blow up at startup.
        if (bytes.length < 32) {
            byte[] padded = new byte[32];
            System.arraycopy(bytes, 0, padded, 0, bytes.length);
            bytes = padded;
        }
        return Keys.hmacShaKeyFor(bytes);
    }

    /** How long a "Remember this device" login lasts. */
    public static final long REMEMBER_ME_MINUTES = 30L * 24 * 60;

    public String generateToken(String userId, String email, String tenantId, boolean rememberMe) {
        Instant now = Instant.now();
        long minutes = rememberMe ? REMEMBER_ME_MINUTES : appProperties.getJwt().getExpirationMinutes();
        Instant expiry = now.plus(minutes, ChronoUnit.MINUTES);
        return Jwts.builder()
                .subject(userId)
                .claim("email", email)
                .claim("tenantId", tenantId)
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiry))
                .signWith(signingKey())
                .compact();
    }

    public Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public long cookieMaxAgeSeconds() {
        return appProperties.getJwt().getExpirationMinutes() * 60;
    }
}
