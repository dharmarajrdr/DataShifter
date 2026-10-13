package com.datashifter.common.client;

import com.datashifter.common.events.KafkaTopics;
import com.datashifter.common.events.PipelineEvents.NotificationEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * Reusable client for any pipeline/service in DataShifter to send alerts and notifications.
 * Can dispatch asynchronously via Kafka event or directly prepare notification events.
 */
@Component
@Slf4j
public class NotifyHubClient {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Autowired(required = false)
    public NotifyHubClient(KafkaTemplate<String, Object> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    /**
     * Send an alert or notification asynchronously via Kafka topic `pipeline.notifications`.
     *
     * @param orgId         Organization ID
     * @param pipelineId    Pipeline ID (optional)
     * @param pipelineName  Pipeline human-readable name
     * @param templateName  Template to use (e.g., "pipeline-failure-alert", "pipeline-success")
     * @param priority      LOW, MEDIUM, HIGH, CRITICAL
     * @param errorMessage  Error message if failure, or null
     * @param metadata      Extra dynamic properties for template placeholders
     */
    public void sendNotification(String orgId,
                                 String pipelineId,
                                 String pipelineName,
                                 String templateName,
                                 String priority,
                                 String errorMessage,
                                 Map<String, Object> metadata) {
        NotificationEvent event = NotificationEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .orgId(orgId)
                .pipelineId(pipelineId)
                .pipelineName(pipelineName)
                .templateName(templateName)
                .priority(priority != null ? priority : "MEDIUM")
                .errorMessage(errorMessage)
                .metadata(metadata)
                .timestamp(Instant.now())
                .build();

        if (kafkaTemplate != null) {
            log.info("NotifyHubClient: publishing notification event {} for pipeline {}", event.getEventId(), pipelineName);
            kafkaTemplate.send(KafkaTopics.PIPELINE_NOTIFICATIONS, pipelineId != null ? pipelineId : orgId, event);
        } else {
            log.warn("NotifyHubClient: KafkaTemplate not available, unable to publish notification event {}", event.getEventId());
        }
    }
}
