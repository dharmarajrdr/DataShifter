package com.datashifter.notification.hub.channels.slack;

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
public class SlackNotificationChannel implements NotificationChannel {

    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate = new RestTemplate();

    @Override
    public ChannelType getChannelType() {
        return ChannelType.SLACK;
    }

    @Override
    public void validateConfig(NotificationChannelConfig channelConfig) throws IllegalArgumentException {
        Map<String, Object> config = parseConfig(channelConfig.getConfigJson());
        if (!config.containsKey("webhookUrl")) {
            throw new IllegalArgumentException("Slack channel requires 'webhookUrl' property.");
        }
    }

    @Override
    public void send(NotificationChannelConfig channelConfig, NotificationContext context) throws Exception {
        Map<String, Object> config = parseConfig(channelConfig.getConfigJson());
        String webhookUrl = (String) config.get("webhookUrl");

        Map<String, Object> payload = buildSlackPayload(context, config);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

        log.info("Sending Slack notification to channel '{}'", channelConfig.getName());
        ResponseEntity<String> response = restTemplate.postForEntity(webhookUrl, request, String.class);
        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new RuntimeException("Slack webhook returned status code: " + response.getStatusCode());
        }
    }

    private Map<String, Object> buildSlackPayload(NotificationContext context, Map<String, Object> config) {
        Map<String, Object> root = new HashMap<>();
        String priorityEmoji = switch (context.getPriority() != null ? context.getPriority().toUpperCase() : "MEDIUM") {
            case "CRITICAL" -> ":rotating_light:";
            case "HIGH" -> ":warning:";
            case "LOW" -> ":information_source:";
            default -> ":bell:";
        };

        String title = priorityEmoji + " *DataShifter Alert: " + (context.getPipelineName() != null ? context.getPipelineName() : "Pipeline Alert") + "*";
        root.put("text", title + "\n" + (context.getMessage() != null ? context.getMessage() : ""));

        List<Map<String, Object>> blocks = new ArrayList<>();
        
        // Header block
        blocks.add(Map.of(
                "type", "header",
                "text", Map.of("type", "plain_text", "text", "DataShifter: " + (context.getPipelineName() != null ? context.getPipelineName() : "Alert"), "emoji", true)
        ));

        // Section with message
        blocks.add(Map.of(
                "type", "section",
                "text", Map.of("type", "mrkdwn", "text", context.getMessage() != null ? context.getMessage() : "")
        ));

        // Context block with priority and timestamp
        List<Map<String, Object>> elements = new ArrayList<>();
        elements.add(Map.of("type", "mrkdwn", "text", "*Priority:* " + (context.getPriority() != null ? context.getPriority() : "MEDIUM")));
        if (context.getTimestamp() != null) {
            elements.add(Map.of("type", "mrkdwn", "text", "*Time:* " + context.getTimestamp().toString()));
        }
        blocks.add(Map.of("type", "context", "elements", elements));

        // Error message callout if present
        if (context.getErrorMessage() != null && !context.getErrorMessage().isBlank()) {
            blocks.add(Map.of(
                    "type", "section",
                    "text", Map.of("type", "mrkdwn", "text", "*Error Details:*\n```" + context.getErrorMessage() + "```")
            ));
        }

        root.put("blocks", blocks);
        return root;
    }

    private Map<String, Object> parseConfig(String configJson) {
        try {
            return objectMapper.readValue(configJson, new TypeReference<>() {});
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid Slack config JSON: " + e.getMessage(), e);
        }
    }
}
