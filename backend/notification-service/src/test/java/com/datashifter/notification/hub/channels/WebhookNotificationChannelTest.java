package com.datashifter.notification.hub.channels;

import com.datashifter.notification.hub.channels.webhook.WebhookNotificationChannel;
import com.datashifter.notification.hub.dto.NotificationContext;
import com.datashifter.notification.hub.models.ChannelType;
import com.datashifter.notification.hub.models.NotificationChannelConfig;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class WebhookNotificationChannelTest {

    private WebhookNotificationChannel webhookChannel;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        webhookChannel = new WebhookNotificationChannel(objectMapper);
    }

    @Test
    void testChannelType() {
        assertEquals(ChannelType.WEBHOOK, webhookChannel.getChannelType());
    }

    @Test
    void testValidateConfigMissingUrl() {
        NotificationChannelConfig config = NotificationChannelConfig.builder()
                .configJson("{\"headers\":{}}")
                .build();

        assertThrows(IllegalArgumentException.class, () -> webhookChannel.validateConfig(config));
    }

    @Test
    void testValidateConfigValidUrl() {
        NotificationChannelConfig config = NotificationChannelConfig.builder()
                .configJson("{\"url\":\"https://example.com/webhook\"}")
                .build();

        assertDoesNotThrow(() -> webhookChannel.validateConfig(config));
    }

    @Test
    void testGraphQLStyleFieldSelection() {
        NotificationContext context = NotificationContext.builder()
                .notificationId("test-notif-123")
                .pipelineId("p-99")
                .pipelineName("Data Pipeline Alpha")
                .priority("HIGH")
                .errorMessage("Fatal syntax error")
                .parameters(Map.of("processed", 100))
                .build();

        // User requested only pipelineName, priority, and errorMessage
        Map<String, Object> config = Map.of(
                "selectedFields", List.of("pipelineName", "priority", "errorMessage")
        );

        Map<String, Object> payload = webhookChannel.buildCustomizablePayload(context, config);

        assertEquals(3, payload.size());
        assertEquals("Data Pipeline Alpha", payload.get("pipelineName"));
        assertEquals("HIGH", payload.get("priority"));
        assertEquals("Fatal syntax error", payload.get("errorMessage"));
        assertFalse(payload.containsKey("notificationId"));
        assertFalse(payload.containsKey("parameters"));
    }
}
