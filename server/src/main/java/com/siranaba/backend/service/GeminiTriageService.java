package com.siranaba.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.siranaba.backend.config.AppProperties;
import com.siranaba.backend.dto.TriageResult;
import com.siranaba.backend.model.Attachment;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Locale;
import java.util.List;
import java.util.Set;

/**
 * Uses Google's Gemini API to assess the severity of a newly submitted
 * maintenance ticket - this is the "AI triage" the original mock server
 * referenced (priority: null // Severity is assessed by AI triage).
 *
 * If GEMINI_API_KEY isn't configured, or the call fails for any reason,
 * this falls back to a small keyword heuristic so ticket creation never
 * breaks because of the AI integration.
 */
@Service
public class GeminiTriageService {

    private static final Logger log = LoggerFactory.getLogger(GeminiTriageService.class);
    private static final Set<String> VALID_PRIORITIES = Set.of("Low", "Medium", "Severe", "Critical");

    private final AppProperties appProperties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public GeminiTriageService(AppProperties appProperties, ObjectMapper objectMapper) {
        this.appProperties = appProperties;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    public TriageResult triage(String category, String title, String description, String location) {
        return triage(category, title, description, location, List.of());
    }

    /** Sends the text and any stored image/PDF evidence to Gemini for assessment. */
    public TriageResult triage(String category, String title, String description, String location, List<Attachment> attachments) {
        if (!appProperties.getGemini().isConfigured()) {
            log.info("GEMINI_API_KEY not set - using keyword-based triage fallback for ticket '{}'.", title);
            return keywordFallback(category, description);
        }

        try {
            String prompt = buildPrompt(category, title, description, location);
            String responseText = callGemini(prompt, attachments);
            TriageResult parsed = parseResponse(responseText);
            if (parsed != null) {
                return parsed;
            }
            log.warn("Gemini response could not be parsed as triage JSON, using fallback.");
            return keywordFallback(category, description);
        } catch (Exception ex) {
            log.warn("Gemini triage call failed ({}), using keyword fallback.", ex.getMessage());
            return keywordFallback(category, description);
        }
    }

    private String buildPrompt(String category, String title, String description, String location) {
        return """
                You are the triage assistant for a residential facility maintenance system.
                A tenant just submitted the maintenance request below. Assess it and respond
                with ONLY a JSON object (no markdown, no commentary) with exactly these keys:

                {
                  "priority": one of "Low", "Medium", "Severe", "Critical",
                  "safetyNote": a short one-sentence safety warning for the tenant if this
                     request involves a real safety hazard (e.g. gas smell, exposed wiring,
                     active flooding, no heat in freezing weather), otherwise an empty string,
                  "estimatedCompletion": a short human-readable estimate such as
                     "Same day", "1-2 business days", or "3-5 business days"
                }

                Guidance:
                - "Critical": immediate danger to health/safety or severe property damage risk
                  (gas leaks, fire hazards, no heat/AC in extreme weather, active flooding,
                  broken locks/exposed entry points).
                - "Severe": significant disruption but not immediately dangerous (no hot water,
                  major appliance failure, persistent leak).
                - "Medium": inconvenient but livable (minor leak, single appliance issue).
                - "Low": cosmetic or non-urgent (squeaky door, light bulb, cosmetic scuff).

                Category: %s
                Title: %s
                Location: %s
                Description: %s
                """.formatted(category, title, location, description);
    }

    private String callGemini(String prompt, List<Attachment> attachments) throws Exception {
        String model = appProperties.getGemini().getModel();
        String url = "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s"
                .formatted(model, appProperties.getGemini().getApiKey());

        var requestBody = objectMapper.createObjectNode();
        var contents = requestBody.putArray("contents");
        var contentNode = contents.addObject();
        var parts = contentNode.putArray("parts");
        parts.addObject().put("text", prompt);
        // Attachments are stored as data URLs by the request form. Gemini receives
        // the actual evidence, not merely the file name; unsupported attachments
        // remain represented by the ticket text and labels.
        for (Attachment attachment : attachments == null ? List.<Attachment>of() : attachments) {
            String dataUrl = attachment.getDataUrl();
            if (dataUrl == null || !dataUrl.startsWith("data:") || !dataUrl.contains(";base64,")) continue;
            int comma = dataUrl.indexOf(',');
            String mimeType = dataUrl.substring(5, dataUrl.indexOf(';'));
            String base64 = dataUrl.substring(comma + 1);
            if (mimeType.startsWith("image/") || "application/pdf".equals(mimeType)) {
                parts.addObject().putObject("inlineData").put("mimeType", mimeType).put("data", base64);
            }
        }

        var generationConfig = requestBody.putObject("generationConfig");
        generationConfig.put("responseMimeType", "application/json");
        generationConfig.put("temperature", 0.2);

        HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(20))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(
                        objectMapper.writeValueAsString(requestBody), StandardCharsets.UTF_8))
                .build();

        HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() >= 300) {
            throw new IllegalStateException("Gemini API returned HTTP " + response.statusCode() + ": " + response.body());
        }

        JsonNode root = objectMapper.readTree(response.body());
        JsonNode textNode = root.path("candidates").path(0).path("content").path("parts").path(0).path("text");
        if (textNode.isMissingNode() || textNode.asText().isBlank()) {
            throw new IllegalStateException("Gemini response had no text content.");
        }
        return textNode.asText();
    }

    private TriageResult parseResponse(String responseText) {
        try {
            JsonNode node = objectMapper.readTree(responseText.trim());
            String priority = node.path("priority").asText("Medium");
            priority = normalizePriority(priority);
            String safetyNote = node.path("safetyNote").asText("");
            String estimatedCompletion = node.path("estimatedCompletion").asText("2-3 business days");
            return new TriageResult(priority, safetyNote, estimatedCompletion);
        } catch (Exception ex) {
            return null;
        }
    }

    private String normalizePriority(String raw) {
        if (raw == null || raw.isBlank()) return "Medium";
        String trimmed = raw.trim();
        String capitalized = trimmed.substring(0, 1).toUpperCase(Locale.ROOT) + trimmed.substring(1).toLowerCase(Locale.ROOT);
        return VALID_PRIORITIES.contains(capitalized) ? capitalized : "Medium";
    }

    /**
     * Simple keyword heuristic used when Gemini is unavailable, so ticket
     * creation always succeeds and still produces a reasonable severity.
     */
    private TriageResult keywordFallback(String category, String description) {
        String text = (category + " " + description).toLowerCase(Locale.ROOT);

        if (containsAny(text, "gas", "smoke", "fire", "flood", "no heat", "exposed wire", "sparking", "carbon monoxide")) {
            return new TriageResult("Critical", "This may be a safety hazard - if you smell gas or see fire/sparking, evacuate and call emergency services.", "Same day");
        }
        if (containsAny(text, "leak", "no hot water", "no water", "broken lock", "not cooling", "not heating", "electrical")) {
            return new TriageResult("Severe", "", "1-2 business days");
        }
        if (containsAny(text, "noisy", "slow drain", "loose", "squeak", "stuck")) {
            return new TriageResult("Low", "", "3-5 business days");
        }
        return new TriageResult("Medium", "", "2-3 business days");
    }

    private boolean containsAny(String text, String... keywords) {
        for (String keyword : keywords) {
            if (text.contains(keyword)) return true;
        }
        return false;
    }
}
