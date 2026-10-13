package com.datashifter.notification.hub.channels.cliq;

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
public class CliqNotificationChannel implements NotificationChannel {

    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate = new RestTemplate();

    @Override
    public ChannelType getChannelType() {
        return ChannelType.CLIQ;
    }

    @Override
    public void validateConfig(NotificationChannelConfig channelConfig) throws IllegalArgumentException {
        Map<String, Object> config = parseConfig(channelConfig.getConfigJson());
        if (!config.containsKey("webhookUrl")) {
            throw new IllegalArgumentException("Zoho Cliq channel requires 'webhookUrl' property.");
        }
    }

    @Override
    public void send(NotificationChannelConfig channelConfig, NotificationContext context) throws Exception {
        Map<String, Object> config = parseConfig(channelConfig.getConfigJson());
        String webhookUrl = (String) config.get("webhookUrl");

        Map<String, Object> payload = buildCliqMessage(context);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        if (config.containsKey("authToken")) {
            headers.set("Authorization", "Zoho-authtoken " + config.get("authToken"));
        }

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

        log.info("Sending Zoho Cliq notification to channel '{}'", channelConfig.getName());
        ResponseEntity<String> response = restTemplate.postForEntity(webhookUrl, request, String.class);
        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new RuntimeException("Zoho Cliq webhook returned status code: " + response.getStatusCode());
        }
    }

    private Map<String, Object> buildCliqMessage(NotificationContext context) {
        Map<String, Object> body = new HashMap<>();

        StringBuilder text = new StringBuilder();
        text.append("*DataShifter Alert:* ").append(context.getPipelineName() != null ? context.getPipelineName() : "Pipeline Alert").append("\n");
        text.append("*Priority:* ").append(context.getPriority() != null ? context.getPriority() : "MEDIUM").append("\n");
        text.append(context.getMessage() != null ? context.getMessage() : "").append("\n");
        if (context.getErrorMessage() != null && !context.getErrorMessage().isBlank()) {
            text.append("```\nError: ").append(context.getErrorMessage()).append("\n```\n");
        }
        if (context.getActionUrl() != null && !context.getActionUrl().isBlank()) {
            text.append("[View Pipeline](").append(context.getActionUrl()).append(")");
        }

        body.put("text", text.toString());

        // Zoho Cliq card layout
        Map<String, Object> card = new HashMap<>();
        card.put("title", "DataShifter Alert");
        card.put("theme", "modern-inline");
        body.put("card", card);

        return body;
    }

    private Map<String, Object> parseConfig(String configJson) {
        try {
            return objectMapper.readValue(configJson, new TypeReference<>() {});
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid Zoho Cliq config JSON: " + e.getMessage(), e);
        }
    }
}
