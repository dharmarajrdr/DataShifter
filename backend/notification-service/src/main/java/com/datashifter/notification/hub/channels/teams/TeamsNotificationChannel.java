package com.datashifter.notification.hub.channels.teams;

import com.datashifter.notification.hub.channels.NotificationChannel;
import com.datashifter.notification.hub.dto.NotificationContext;
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

import java.util.*;

@Component
@Slf4j
@RequiredArgsConstructor
public class TeamsNotificationChannel implements NotificationChannel {

    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate = new RestTemplate();

    @Override
    public ChannelType getChannelType() {
        return ChannelType.TEAMS;
    }

    @Override
    public void validateConfig(NotificationChannelConfig channelConfig) throws IllegalArgumentException {
        Map<String, Object> config = parseConfig(channelConfig.getConfigJson());
        if (!config.containsKey("webhookUrl")) {
            throw new IllegalArgumentException("Teams channel requires 'webhookUrl' property.");
        }
    }

    @Override
    public void send(NotificationChannelConfig channelConfig, NotificationContext context) throws Exception {
        Map<String, Object> config = parseConfig(channelConfig.getConfigJson());
        String webhookUrl = (String) config.get("webhookUrl");

        Map<String, Object> payload = buildTeamsMessageCard(context);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

        log.info("Sending Microsoft Teams notification to channel '{}'", channelConfig.getName());
        ResponseEntity<String> response = restTemplate.postForEntity(webhookUrl, request, String.class);
        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new RuntimeException("Teams webhook returned status code: " + response.getStatusCode());
        }
    }

    private Map<String, Object> buildTeamsMessageCard(NotificationContext context) {
        Map<String, Object> card = new HashMap<>();
        card.put("@type", "MessageCard");
        card.put("@context", "https://schema.org/extensions");
        
        String themeColor = switch (context.getPriority() != null ? context.getPriority().toUpperCase() : "MEDIUM") {
            case "CRITICAL" -> "DC2626";
            case "HIGH" -> "EA580C";
            case "LOW" -> "16A34A";
            default -> "2563EB";
        };
        card.put("themeColor", themeColor);
        card.put("summary", "DataShifter: " + (context.getPipelineName() != null ? context.getPipelineName() : "Alert"));
        card.put("title", "DataShifter Alert: " + (context.getPipelineName() != null ? context.getPipelineName() : "Pipeline Alert"));

        List<Map<String, Object>> sections = new ArrayList<>();
        Map<String, Object> section = new HashMap<>();
        section.put("activityTitle", context.getSubject() != null ? context.getSubject() : "Pipeline Event");
        section.put("activitySubtitle", "Priority: " + (context.getPriority() != null ? context.getPriority() : "MEDIUM"));
        section.put("text", context.getMessage() != null ? context.getMessage() : "");

        List<Map<String, String>> facts = new ArrayList<>();
        if (context.getPipelineId() != null) {
            facts.add(Map.of("name", "Pipeline ID:", "value", context.getPipelineId()));
        }
        if (context.getTimestamp() != null) {
            facts.add(Map.of("name", "Timestamp:", "value", context.getTimestamp().toString()));
        }
        if (context.getErrorMessage() != null && !context.getErrorMessage().isBlank()) {
            facts.add(Map.of("name", "Error:", "value", context.getErrorMessage()));
        }
        if (!facts.isEmpty()) {
            section.put("facts", facts);
        }

        sections.add(section);
        card.put("sections", sections);

        if (context.getActionUrl() != null && !context.getActionUrl().isBlank()) {
            List<Map<String, Object>> actions = new ArrayList<>();
            Map<String, Object> openAction = new HashMap<>();
            openAction.put("@type", "OpenURI");
            openAction.put("name", "View Pipeline");
            openAction.put("targets", List.of(Map.of("os", "default", "uri", context.getActionUrl())));
            actions.add(openAction);
            card.put("potentialAction", actions);
        }

        return card;
    }

    private Map<String, Object> parseConfig(String configJson) {
        try {
            return objectMapper.readValue(configJson, new TypeReference<>() {});
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid Teams config JSON: " + e.getMessage(), e);
        }
    }
}
