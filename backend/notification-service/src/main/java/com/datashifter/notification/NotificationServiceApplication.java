package com.datashifter.notification;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Notification Service — real-time event push via SSE and NotifyHub notification manager.
 *
 * Handles:
 * 1. Real-time browser event streaming via SSE
 * 2. NotifyHub alert dispatching (Email, Slack, Teams, Cliq, Webhook) with templates & retries
 */
@SpringBootApplication(
    scanBasePackages = {
        "com.datashifter.notification",
        "com.datashifter.common.utils",
        "com.datashifter.common.exceptions",
        "com.datashifter.common.security"
    }
)
@EnableScheduling
@EnableAsync
public class NotificationServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(NotificationServiceApplication.class, args);
    }
}
