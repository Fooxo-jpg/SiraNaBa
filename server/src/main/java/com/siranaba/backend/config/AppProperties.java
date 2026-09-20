package com.siranaba.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Typed view over the `app.*` keys in application.yml, which are themselves
 * populated from environment variables (see .env.example).
 */
@Component
@ConfigurationProperties(prefix = "app")
public class AppProperties {

    private final Cors cors = new Cors();
    private final Jwt jwt = new Jwt();
    private final Gemini gemini = new Gemini();
    private final Seed seed = new Seed();

    public Cors getCors() { return cors; }
    public Jwt getJwt() { return jwt; }
    public Gemini getGemini() { return gemini; }
    public Seed getSeed() { return seed; }

    public static class Cors {
        private String allowedOrigins = "http://localhost:5173";
        public String getAllowedOrigins() { return allowedOrigins; }
        public void setAllowedOrigins(String allowedOrigins) { this.allowedOrigins = allowedOrigins; }
    }

    public static class Jwt {
        private String secret;
        private long expirationMinutes = 1440;
        private String cookieName = "siranaba_token";
        public String getSecret() { return secret; }
        public void setSecret(String secret) { this.secret = secret; }
        public long getExpirationMinutes() { return expirationMinutes; }
        public void setExpirationMinutes(long expirationMinutes) { this.expirationMinutes = expirationMinutes; }
        public String getCookieName() { return cookieName; }
        public void setCookieName(String cookieName) { this.cookieName = cookieName; }
    }

    public static class Gemini {
        private String apiKey;
        private String model = "gemini-2.0-flash";
        public String getApiKey() { return apiKey; }
        public void setApiKey(String apiKey) { this.apiKey = apiKey; }
        public String getModel() { return model; }
        public void setModel(String model) { this.model = model; }
        public boolean isConfigured() { return apiKey != null && !apiKey.isBlank(); }
    }

    public static class Seed {
        private boolean enabled = true;
        private String demoEmail = "alex.rivers@siranaba.com";
        private String demoPassword = "Password123!";
        private String adminEmail = "admin@siranaba.com";
        private String adminPassword = "Password123!";
        public boolean isEnabled() { return enabled; }
        public void setEnabled(boolean enabled) { this.enabled = enabled; }
        public String getDemoEmail() { return demoEmail; }
        public void setDemoEmail(String demoEmail) { this.demoEmail = demoEmail; }
        public String getDemoPassword() { return demoPassword; }
        public void setDemoPassword(String demoPassword) { this.demoPassword = demoPassword; }
        public String getAdminEmail() { return adminEmail; }
        public void setAdminEmail(String adminEmail) { this.adminEmail = adminEmail; }
        public String getAdminPassword() { return adminPassword; }
        public void setAdminPassword(String adminPassword) { this.adminPassword = adminPassword; }
    }
}
