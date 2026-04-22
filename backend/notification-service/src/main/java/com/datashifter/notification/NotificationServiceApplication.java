package com.datashifter.notification;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Notification Service — real-time event push via SSE.
 *
 * This service has NO database. It is a pure Kafka → SSE bridge.
 * Kafka events come in, matching SSE connections get the push.
 *
 * Excludes DataSource auto-config since we don't use JPA/JDBC.
 * EnableScheduling is needed for the heartbeat scheduler.
 */
@SpringBootApplication(
    scanBasePackages = {
        "com.datashifter.notification",
        "com.datashifter.common.utils",
        "com.datashifter.common.exceptions",
        "com.datashifter.common.security"
    },
    exclude = DataSourceAutoConfiguration.class
)
@EnableScheduling
public class NotificationServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(NotificationServiceApplication.class, args);
    }
}
