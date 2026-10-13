package com.datashifter.notification.hub.controllers;

import com.datashifter.common.security.UserContext;
import com.datashifter.notification.hub.channels.ChannelService;
import com.datashifter.notification.hub.channels.webhook.WebhookNotificationChannel;
import com.datashifter.notification.hub.dto.ChannelConfigRequest;
import com.datashifter.notification.hub.dto.WebhookFieldMetadata;
import com.datashifter.notification.hub.models.NotificationChannelConfig;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller for configuring notification channels (Email, Slack, Teams, Cliq, Webhooks).
 */
@RestController
@RequestMapping("/api/v1/notifyhub/channels")
@RequiredArgsConstructor
public class ChannelController {

    private final ChannelService channelService;

    @GetMapping
    public ResponseEntity<List<NotificationChannelConfig>> listChannels(@RequestParam(required = false) String pipelineId) {
        String orgId = UserContext.getCurrentOrgId();
        if (orgId == null || orgId.isBlank()) orgId = "org-default";
        return ResponseEntity.ok(channelService.listChannels(orgId, pipelineId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<NotificationChannelConfig> getChannel(@PathVariable String id) {
        String orgId = UserContext.getCurrentOrgId();
        if (orgId == null || orgId.isBlank()) orgId = "org-default";
        return ResponseEntity.ok(channelService.getChannel(orgId, id));
    }

    @PostMapping
    public ResponseEntity<NotificationChannelConfig> createChannel(@Valid @RequestBody ChannelConfigRequest request) {
        String orgId = UserContext.getCurrentOrgId();
        if (orgId == null || orgId.isBlank()) orgId = "org-default";
        return ResponseEntity.status(HttpStatus.CREATED).body(channelService.createChannel(orgId, request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<NotificationChannelConfig> updateChannel(@PathVariable String id,
                                                                  @Valid @RequestBody ChannelConfigRequest request) {
        String orgId = UserContext.getCurrentOrgId();
        if (orgId == null || orgId.isBlank()) orgId = "org-default";
        return ResponseEntity.ok(channelService.updateChannel(orgId, id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteChannel(@PathVariable String id) {
        String orgId = UserContext.getCurrentOrgId();
        if (orgId == null || orgId.isBlank()) orgId = "org-default";
        channelService.deleteChannel(orgId, id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Lists available webhook field metadata so consumers can configure
     * which fields to include in custom webhook payloads (GraphQL-style checkboxes).
     */
    @GetMapping("/webhook/fields")
    public ResponseEntity<List<WebhookFieldMetadata>> getWebhookFields() {
        return ResponseEntity.ok(WebhookNotificationChannel.AVAILABLE_FIELDS);
    }
}
