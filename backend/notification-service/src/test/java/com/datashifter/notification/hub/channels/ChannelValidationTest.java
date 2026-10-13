package com.datashifter.notification.hub.channels;

import com.datashifter.notification.hub.channels.cliq.CliqNotificationChannel;
import com.datashifter.notification.hub.channels.email.EmailNotificationChannel;
import com.datashifter.notification.hub.channels.slack.SlackNotificationChannel;
import com.datashifter.notification.hub.channels.teams.TeamsNotificationChannel;
import com.datashifter.notification.hub.channels.webhook.WebhookNotificationChannel;
import com.datashifter.notification.hub.models.ChannelType;
import com.datashifter.notification.hub.models.NotificationChannelConfig;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ChannelValidationTest {

    private ObjectMapper objectMapper;
    private EmailNotificationChannel emailChannel;
    private SlackNotificationChannel slackChannel;
    private TeamsNotificationChannel teamsChannel;
    private CliqNotificationChannel cliqChannel;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        emailChannel = new EmailNotificationChannel(objectMapper, null);
        slackChannel = new SlackNotificationChannel(objectMapper);
        teamsChannel = new TeamsNotificationChannel(objectMapper);
        cliqChannel = new CliqNotificationChannel(objectMapper);
    }

    @Test
    void testEmailValidation() {
        assertEquals(ChannelType.EMAIL, emailChannel.getChannelType());

        NotificationChannelConfig valid = NotificationChannelConfig.builder()
                .configJson("{\"to\": \"dev@datashifter.io\"}")
                .build();
        assertDoesNotThrow(() -> emailChannel.validateConfig(valid));

        NotificationChannelConfig invalid = NotificationChannelConfig.builder()
                .configJson("{\"host\": \"smtp.gmail.com\"}")
                .build();
        assertThrows(IllegalArgumentException.class, () -> emailChannel.validateConfig(invalid));
    }

    @Test
    void testSlackValidation() {
        assertEquals(ChannelType.SLACK, slackChannel.getChannelType());

        NotificationChannelConfig valid = NotificationChannelConfig.builder()
                .configJson("{\"webhookUrl\": \"https://hooks.slack.com/services/T00/B00/X\"}")
                .build();
        assertDoesNotThrow(() -> slackChannel.validateConfig(valid));

        NotificationChannelConfig invalid = NotificationChannelConfig.builder()
                .configJson("{\"channel\": \"#alerts\"}")
                .build();
        assertThrows(IllegalArgumentException.class, () -> slackChannel.validateConfig(invalid));
    }

    @Test
    void testTeamsValidation() {
        assertEquals(ChannelType.TEAMS, teamsChannel.getChannelType());

        NotificationChannelConfig valid = NotificationChannelConfig.builder()
                .configJson("{\"webhookUrl\": \"https://outlook.office.com/webhook/xxx\"}")
                .build();
        assertDoesNotThrow(() -> teamsChannel.validateConfig(valid));

        NotificationChannelConfig invalid = NotificationChannelConfig.builder()
                .configJson("{}")
                .build();
        assertThrows(IllegalArgumentException.class, () -> teamsChannel.validateConfig(invalid));
    }

    @Test
    void testCliqValidation() {
        assertEquals(ChannelType.CLIQ, cliqChannel.getChannelType());

        NotificationChannelConfig valid = NotificationChannelConfig.builder()
                .configJson("{\"webhookUrl\": \"https://cliq.zoho.com/api/v2/channelsbyname/alerts/message\"}")
                .build();
        assertDoesNotThrow(() -> cliqChannel.validateConfig(valid));

        NotificationChannelConfig invalid = NotificationChannelConfig.builder()
                .configJson("{}")
                .build();
        assertThrows(IllegalArgumentException.class, () -> cliqChannel.validateConfig(invalid));
    }
}
