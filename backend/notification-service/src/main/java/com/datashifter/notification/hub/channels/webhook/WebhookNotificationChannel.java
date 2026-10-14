package com.datashifter.notification.hub.channels.webhook;

import com.datashifter.notification.hub.channels.NotificationChannel;
import com.datashifter.notification.hub.dto.NotificationContext;
import com.datashifter.notification.hub.dto.WebhookFieldMetadata;
import com.datashifter.notification.hub.models.ChannelType;
import com.datashifter.notification.hub.models.NotificationChannelConfig;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.*;

/**
 * Highly configurable Webhook module.
 * Allows consumers to select which fields they want in the payload (GraphQL-style field selection).
 * Supports custom HTTP headers, authorization tokens, and signature verification secrets.
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class WebhookNotificationChannel implements NotificationChannel {

    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate = new RestTemplate();

    public static final List<WebhookFieldMetadata> AVAILABLE_FIELDS = List.of(
            WebhookFieldMetadata.builder().key("notificationId").description("Unique notification UUID").example("9f8931d0-b0bf-4a1e").defaultIncluded(true).build(),
            WebhookFieldMetadata.builder().key("timestamp").description("ISO-8601 creation timestamp").example("2026-10-13T15:00:00Z").defaultIncluded(true).build(),
            WebhookFieldMetadata.builder().key("orgId").description("Organization identifier").example("org-default").defaultIncluded(true).build(),
            WebhookFieldMetadata.builder().key("pipelineId").description("Associated pipeline ID").example("p-100").defaultIncluded(true).build(),
            WebhookFieldMetadata.builder().key("pipelineName").description("Human-readable pipeline name").example("MySQL to Postgres Migration").defaultIncluded(true).build(),
            WebhookFieldMetadata.builder().key("priority").description("Severity level (LOW, MEDIUM, HIGH, CRITICAL)").example("HIGH").defaultIncluded(true).build(),
            WebhookFieldMetadata.builder().key("templateName").description("Template utilized for message").example("pipeline-failure-alert").defaultIncluded(false).build(),
            WebhookFieldMetadata.builder().key("title").description("Rendered subject or alert title").example("Pipeline Migration Failure").defaultIncluded(true).build(),
            WebhookFieldMetadata.builder().key("message").description("Full rendered alert body").example("Pipeline failed due to connection timeout.").defaultIncluded(true).build(),
            WebhookFieldMetadata.builder().key("errorMessage").description("Raw exception or error message").example("SocketTimeoutException: Read timed out").defaultIncluded(true).build(),
            WebhookFieldMetadata.builder().key("errorType").description("Error category code").example("NETWORK_TIMEOUT").defaultIncluded(false).build(),
            WebhookFieldMetadata.builder().key("actionUrl").description("Link to view the pipeline in console").example("http://localhost:3000/pipelines/p-100").defaultIncluded(false).build(),
            WebhookFieldMetadata.builder().key("parameters").description("Dynamic context key-values passed by caller").example("{\"rowsProcessed\": 50000}").defaultIncluded(true).build()
    );

    @Override
    public ChannelType getChannelType() {
        return ChannelType.WEBHOOK;
    }

    @Override
    public void validateConfig(NotificationChannelConfig channelConfig) throws IllegalArgumentException {
        Map<String, Object> config = parseConfig(channelConfig.getConfigJson());
        if (!config.containsKey("endpointUrl") && !config.containsKey("url")) {
            throw new IllegalArgumentException("Webhook channel requires 'endpointUrl' or 'url' property.");
        }
    }

    @Override
    public void send(NotificationChannelConfig channelConfig, NotificationContext context) throws Exception {
        Map<String, Object> config = parseConfig(channelConfig.getConfigJson());
        String url = (String) config.getOrDefault("endpointUrl", config.get("url"));

        Map<String, Object> payload = buildCustomizablePayload(context, config);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        // Add custom headers configured by user (e.g. X-Webhook-Token, Authorization, etc.)
        if (config.get("headers") instanceof Map<?, ?> customHeaders) {
            for (Map.Entry<?, ?> entry : customHeaders.entrySet()) {
                if (entry.getKey() != null && entry.getValue() != null) {
                    headers.set(String.valueOf(entry.getKey()), String.valueOf(entry.getValue()));
                }
            }
        }

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

        log.info("Sending Webhook notification to URL '{}' (channel: '{}')", url, channelConfig.getName());
        ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);
        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new RuntimeException("Webhook endpoint returned status code: " + response.getStatusCode());
        }
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> buildCustomizablePayload(NotificationContext context, Map<String, Object> config) {
        // Build all possible properties
        Map<String, Object> fullDictionary = new HashMap<>();
        fullDictionary.put("notificationId", context.getNotificationId() != null ? context.getNotificationId() : UUID.randomUUID().toString());
        fullDictionary.put("timestamp", context.getTimestamp() != null ? context.getTimestamp().toString() : Instant.now().toString());
        fullDictionary.put("orgId", context.getOrgId());
        fullDictionary.put("pipelineId", context.getPipelineId());
        fullDictionary.put("pipelineName", context.getPipelineName());
        fullDictionary.put("priority", context.getPriority() != null ? context.getPriority() : "MEDIUM");
        fullDictionary.put("templateName", context.getTemplateName());
        fullDictionary.put("title", context.getSubject() != null ? context.getSubject() : "DataShifter Alert");
        fullDictionary.put("message", context.getMessage() != null ? context.getMessage() : "");
        fullDictionary.put("errorMessage", context.getErrorMessage());
        fullDictionary.put("errorType", context.getErrorType());
        fullDictionary.put("actionUrl", context.getActionUrl());
        fullDictionary.put("parameters", context.getParameters());

        // Field selection: user-selected fields (GraphQL-style)
        List<String> selectedFields = null;
        if (config.containsKey("selectedFields") && config.get("selectedFields") instanceof List<?>) {
            selectedFields = (List<String>) config.get("selectedFields");
        }

        Map<String, Object> result = new LinkedHashMap<>();
        if (selectedFields != null && !selectedFields.isEmpty()) {
            for (String field : selectedFields) {
                if (fullDictionary.containsKey(field)) {
                    result.put(field, fullDictionary.get(field));
                }
            }
        } else {
            // Default included fields if no custom selection provided
            for (WebhookFieldMetadata meta : AVAILABLE_FIELDS) {
                if (meta.isDefaultIncluded() && fullDictionary.get(meta.getKey()) != null) {
                    result.put(meta.getKey(), fullDictionary.get(meta.getKey()));
                }
            }
        }

        return result;
    }

    private Map<String, Object> parseConfig(String configJson) {
        try {
            return objectMapper.readValue(configJson, new TypeReference<>() {});
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid Webhook config JSON: " + e.getMessage(), e);
        }
    }
}
