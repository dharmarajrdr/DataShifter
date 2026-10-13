package com.datashifter.notification.hub.controllers;

import com.datashifter.notification.hub.dto.ListenerRequest;
import com.datashifter.notification.hub.models.NotificationListener;
import com.datashifter.notification.hub.repositories.NotificationListenerRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/notifyhub/listeners")
@RequiredArgsConstructor
@Slf4j
public class ListenerController {

    private final NotificationListenerRepository listenerRepository;

    private String resolveOrgId(String headerOrgId) {
        if (headerOrgId != null && !headerOrgId.isBlank()) {
            return headerOrgId;
        }
        return "054c4e3f-c927-4c3b-817c-139b643d414e";
    }

    @GetMapping
    public ResponseEntity<List<NotificationListener>> listListeners(
            @RequestHeader(value = "X-Org-Id", required = false) String orgId) {
        String effectiveOrg = resolveOrgId(orgId);
        List<NotificationListener> list = listenerRepository.findByOrgIdOrderByCreatedAtDesc(effectiveOrg);
        return ResponseEntity.ok(list);
    }

    @GetMapping("/{id}")
    public ResponseEntity<NotificationListener> getListener(
            @RequestHeader(value = "X-Org-Id", required = false) String orgId,
            @PathVariable String id) {
        String effectiveOrg = resolveOrgId(orgId);
        return listenerRepository.findByOrgIdAndId(effectiveOrg, id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<NotificationListener> createListener(
            @RequestHeader(value = "X-Org-Id", required = false) String orgId,
            @Valid @RequestBody ListenerRequest request) {
        String effectiveOrg = resolveOrgId(orgId);
        String eventKey = request.getEventKey();
        if (eventKey == null || eventKey.isBlank()) {
            eventKey = request.getResourceType().toLowerCase() + "." + request.getEventAction().toLowerCase();
        }

        NotificationListener listener = NotificationListener.builder()
                .orgId(effectiveOrg)
                .resourceType(request.getResourceType().toUpperCase())
                .eventAction(request.getEventAction().toUpperCase())
                .eventKey(eventKey)
                .name(request.getName())
                .description(request.getDescription())
                .enabled(request.isEnabled())
                .channelId(request.getChannelId())
                .templateId(request.getTemplateId())
                .filterResourceId(request.getFilterResourceId())
                .build();

        NotificationListener saved = listenerRepository.save(listener);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<NotificationListener> updateListener(
            @RequestHeader(value = "X-Org-Id", required = false) String orgId,
            @PathVariable String id,
            @Valid @RequestBody ListenerRequest request) {
        String effectiveOrg = resolveOrgId(orgId);
        return listenerRepository.findByOrgIdAndId(effectiveOrg, id)
                .map(existing -> {
                    String eventKey = request.getEventKey();
                    if (eventKey == null || eventKey.isBlank()) {
                        eventKey = request.getResourceType().toLowerCase() + "." + request.getEventAction().toLowerCase();
                    }
                    existing.setName(request.getName());
                    existing.setDescription(request.getDescription());
                    existing.setResourceType(request.getResourceType().toUpperCase());
                    existing.setEventAction(request.getEventAction().toUpperCase());
                    existing.setEventKey(eventKey);
                    existing.setEnabled(request.isEnabled());
                    existing.setChannelId(request.getChannelId());
                    existing.setTemplateId(request.getTemplateId());
                    existing.setFilterResourceId(request.getFilterResourceId());
                    NotificationListener saved = listenerRepository.save(existing);
                    return ResponseEntity.ok(saved);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteListener(
            @RequestHeader(value = "X-Org-Id", required = false) String orgId,
            @PathVariable String id) {
        String effectiveOrg = resolveOrgId(orgId);
        return listenerRepository.findByOrgIdAndId(effectiveOrg, id)
                .map(existing -> {
                    listenerRepository.delete(existing);
                    return ResponseEntity.noContent().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
