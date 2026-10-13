package com.datashifter.notification.hub.engine;

import com.datashifter.notification.hub.channels.ChannelRegistry;
import com.datashifter.notification.hub.channels.NotificationChannel;
import com.datashifter.notification.hub.dto.NotificationContext;
import com.datashifter.notification.hub.dto.NotificationRequest;
import com.datashifter.notification.hub.dto.NotificationResponse;
import com.datashifter.notification.hub.models.*;
import com.datashifter.notification.hub.repositories.NotificationChannelRepository;
import com.datashifter.notification.hub.repositories.NotificationDeliveryLogRepository;
import com.datashifter.notification.hub.templates.TemplateEngine;
import com.datashifter.notification.hub.templates.TemplateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.CompletableFuture;

/**
 * NotifyHub core orchestrator:
 * Resolves templates, resolves matching channels, renders messages, and dispatches asynchronously
 * with exponential backoff retries and audit logging.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class NotifyHubDispatcher {

    private final ChannelRegistry channelRegistry;
    private final NotificationChannelRepository channelRepository;
    private final NotificationDeliveryLogRepository deliveryLogRepository;
    private final TemplateService templateService;
    private final TemplateEngine templateEngine;
    private final RetryExecutor retryExecutor;

    /**
     * Dispatch notification asynchronously (non-blocking).
     */
    @Async
    public CompletableFuture<NotificationResponse> dispatchAsync(NotificationRequest request) {
        return CompletableFuture.completedFuture(dispatchSync(request));
    }

    /**
     * Core dispatch logic.
     */
    public NotificationResponse dispatchSync(NotificationRequest request) {
        String notificationId = UUID.randomUUID().toString();
        log.info("NotifyHub dispatching notification id={} for org={} pipeline={}",
                notificationId, request.getOrgId(), request.getPipelineName());

        try {
            // 1. Resolve template
            String templateName = request.getTemplateName() != null ? request.getTemplateName() : "pipeline-failure-alert";
            NotificationTemplate template = templateService.getTemplate(request.getOrgId(), templateName);

            // 2. Prepare context & render message
            Map<String, Object> values = new HashMap<>();
            if (request.getParameters() != null) {
                values.putAll(request.getParameters());
            }
            values.put("pipeline_name", request.getPipelineName() != null ? request.getPipelineName() : "N/A");
            values.put("pipeline_id", request.getPipelineId() != null ? request.getPipelineId() : "N/A");
            values.put("org_id", request.getOrgId());
            values.put("priority", request.getPriority() != null ? request.getPriority() : "MEDIUM");
            values.put("error_message", request.getErrorMessage() != null ? request.getErrorMessage() : "None");
            values.put("error_type", request.getErrorType() != null ? request.getErrorType() : "N/A");
            values.put("action_url", request.getActionUrl() != null ? request.getActionUrl() : "");
            values.put("timestamp", Instant.now().toString());

            String renderedSubject = request.getCustomSubject() != null ? request.getCustomSubject() :
                    templateEngine.render(template.getSubjectTemplate(), values);
            String renderedBody = request.getCustomMessage() != null ? request.getCustomMessage() :
                    templateEngine.render(template.getBodyTemplate(), values);

            NotificationContext context = NotificationContext.builder()
                    .notificationId(notificationId)
                    .orgId(request.getOrgId())
                    .pipelineId(request.getPipelineId())
                    .pipelineName(request.getPipelineName())
                    .templateName(templateName)
                    .priority(request.getPriority() != null ? request.getPriority() : "MEDIUM")
                    .errorMessage(request.getErrorMessage())
                    .errorType(request.getErrorType())
                    .actionUrl(request.getActionUrl())
                    .timestamp(Instant.now())
                    .parameters(values)
                    .subject(renderedSubject)
                    .message(renderedBody)
                    .build();

            // 3. Resolve target channels (pipeline-specific + org-wide enabled channels)
            List<NotificationChannelConfig> channels = resolveChannels(request);

            if (channels.isEmpty()) {
                log.warn("No active notification channels found for org {} and pipeline {}",
                        request.getOrgId(), request.getPipelineId());
                return NotificationResponse.builder()
                        .notificationId(notificationId)
                        .status(DeliveryStatus.SENT)
                        .message("No active channels configured; notification skipped.")
                        .timestamp(Instant.now())
                        .build();
            }

            // 4. Send to all resolved channels
            boolean allSuccessful = true;
            for (NotificationChannelConfig config : channels) {
                boolean sent = sendToChannelWithRetryAndLog(config, context);
                if (!sent) {
                    allSuccessful = false;
                }
            }

            return NotificationResponse.builder()
                    .notificationId(notificationId)
                    .status(allSuccessful ? DeliveryStatus.SENT : DeliveryStatus.RETRYING)
                    .message("Dispatched to " + channels.size() + " channel(s).")
                    .timestamp(Instant.now())
                    .build();

        } catch (Exception e) {
            log.error("Failed to dispatch notification {}: {}", notificationId, e.getMessage(), e);
            return NotificationResponse.builder()
                    .notificationId(notificationId)
                    .status(DeliveryStatus.FAILED)
                    .message("Dispatch failed: " + e.getMessage())
                    .timestamp(Instant.now())
                    .build();
        }
    }

    private List<NotificationChannelConfig> resolveChannels(NotificationRequest request) {
        List<NotificationChannelConfig> activeConfigs = channelRepository.findByOrgIdAndEnabledTrue(request.getOrgId());
        List<NotificationChannelConfig> matched = new ArrayList<>();

        for (NotificationChannelConfig cfg : activeConfigs) {
            // If target channels filter is provided, enforce it
            if (request.getTargetChannels() != null && !request.getTargetChannels().isEmpty()) {
                if (!request.getTargetChannels().contains(cfg.getChannelType())) {
                    continue;
                }
            }

            // Match pipeline level channel or global org channel (pipelineId == null)
            if (cfg.getPipelineId() == null ||
                    (request.getPipelineId() != null && cfg.getPipelineId().equals(request.getPipelineId()))) {
                matched.add(cfg);
            }
        }

        return matched;
    }

    private boolean sendToChannelWithRetryAndLog(NotificationChannelConfig config, NotificationContext context) {
        Optional<NotificationChannel> channelOpt = channelRegistry.getChannel(config.getChannelType());
        if (channelOpt.isEmpty()) {
            log.warn("No channel implementation registered for type: {}", config.getChannelType());
            return false;
        }

        NotificationChannel channel = channelOpt.get();
        NotificationDeliveryLog logEntry = NotificationDeliveryLog.builder()
                .orgId(context.getOrgId())
                .pipelineId(context.getPipelineId())
                .eventId(context.getNotificationId())
                .templateName(context.getTemplateName())
                .channelType(config.getChannelType())
                .channelName(config.getName())
                .status(DeliveryStatus.PENDING)
                .attemptCount(0)
                .payloadSnapshot(context.getMessage())
                .build();

        try {
            retryExecutor.executeWithRetry(config.getName(), () -> {
                logEntry.setAttemptCount(logEntry.getAttemptCount() + 1);
                channel.send(config, context);
            });

            logEntry.setStatus(DeliveryStatus.SENT);
            logEntry.setSentAt(Instant.now());
            deliveryLogRepository.save(logEntry);
            return true;
        } catch (Exception e) {
            log.error("All retry attempts failed sending via channel '{}': {}", config.getName(), e.getMessage());
            logEntry.setStatus(DeliveryStatus.FAILED);
            logEntry.setErrorMessage(e.getMessage());
            deliveryLogRepository.save(logEntry);
            return false;
        }
    }
}
