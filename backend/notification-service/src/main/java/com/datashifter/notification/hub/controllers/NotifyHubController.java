package com.datashifter.notification.hub.controllers;

import com.datashifter.common.security.UserContext;
import com.datashifter.notification.hub.dto.NotificationRequest;
import com.datashifter.notification.hub.dto.NotificationResponse;
import com.datashifter.notification.hub.engine.NotifyHubDispatcher;
import com.datashifter.notification.hub.models.DeliveryStatus;
import com.datashifter.notification.hub.models.NotificationDeliveryLog;
import com.datashifter.notification.hub.repositories.NotificationDeliveryLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Controller exposing NotifyHub dispatch and audit logs endpoints.
 */
@RestController
@RequestMapping("/api/v1/notifyhub")
@RequiredArgsConstructor
@Slf4j
public class NotifyHubController {

    private final NotifyHubDispatcher dispatcher;
    private final NotificationDeliveryLogRepository deliveryLogRepository;

    /**
     * Asynchronous and non-blocking notification dispatch.
     * Returns 202 Accepted immediately.
     */
    @PostMapping("/send")
    public ResponseEntity<NotificationResponse> sendNotification(@RequestBody NotificationRequest request) {
        String orgId = UserContext.getCurrentOrgId();
        if (orgId != null && !orgId.isBlank()) {
            request.setOrgId(orgId);
        } else if (request.getOrgId() == null) {
            request.setOrgId("org-default");
        }

        String notificationId = UUID.randomUUID().toString();

        // Dispatch asynchronously in background thread pool
        dispatcher.dispatchAsync(request);

        return ResponseEntity.status(HttpStatus.ACCEPTED).body(
                NotificationResponse.builder()
                        .notificationId(notificationId)
                        .status(DeliveryStatus.PENDING)
                        .message("Notification queued for delivery.")
                        .timestamp(Instant.now())
                        .build()
        );
    }

    /**
     * Query delivery audit history for the current organization or pipeline.
     */
    @GetMapping("/logs")
    public ResponseEntity<List<NotificationDeliveryLog>> getDeliveryLogs(@RequestParam(required = false) String pipelineId) {
        String orgId = UserContext.getCurrentOrgId();
        if (orgId == null || orgId.isBlank()) {
            orgId = "org-default";
        }

        List<NotificationDeliveryLog> logs;
        if (pipelineId != null && !pipelineId.isBlank()) {
            logs = deliveryLogRepository.findByOrgIdAndPipelineIdOrderByCreatedAtDesc(orgId, pipelineId);
        } else {
            logs = deliveryLogRepository.findByOrgIdOrderByCreatedAtDesc(orgId);
        }

        return ResponseEntity.ok(logs);
    }
}
