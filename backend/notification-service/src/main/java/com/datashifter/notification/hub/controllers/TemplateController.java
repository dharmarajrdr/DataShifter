package com.datashifter.notification.hub.controllers;

import com.datashifter.common.security.UserContext;
import com.datashifter.notification.hub.dto.TemplateRequest;
import com.datashifter.notification.hub.dto.TemplateSamplePreview;
import com.datashifter.notification.hub.models.NotificationTemplate;
import com.datashifter.notification.hub.templates.TemplateService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller for managing notification templates with preview and placeholder assistance.
 */
@RestController
@RequestMapping("/api/v1/notifyhub/templates")
@RequiredArgsConstructor
public class TemplateController {

    private final TemplateService templateService;

    @GetMapping
    public ResponseEntity<List<NotificationTemplate>> listTemplates() {
        String orgId = UserContext.getCurrentOrgId();
        if (orgId == null || orgId.isBlank()) orgId = "org-default";
        return ResponseEntity.ok(templateService.listTemplates(orgId));
    }

    @GetMapping("/{name}")
    public ResponseEntity<NotificationTemplate> getTemplate(@PathVariable String name) {
        String orgId = UserContext.getCurrentOrgId();
        if (orgId == null || orgId.isBlank()) orgId = "org-default";
        return ResponseEntity.ok(templateService.getTemplate(orgId, name));
    }

    @PostMapping
    public ResponseEntity<NotificationTemplate> createTemplate(@Valid @RequestBody TemplateRequest request) {
        String orgId = UserContext.getCurrentOrgId();
        if (orgId == null || orgId.isBlank()) orgId = "org-default";
        return ResponseEntity.status(HttpStatus.CREATED).body(templateService.createTemplate(orgId, request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<NotificationTemplate> updateTemplate(@PathVariable String id,
                                                              @Valid @RequestBody TemplateRequest request) {
        String orgId = UserContext.getCurrentOrgId();
        if (orgId == null || orgId.isBlank()) orgId = "org-default";
        return ResponseEntity.ok(templateService.updateTemplate(orgId, id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTemplate(@PathVariable String id) {
        String orgId = UserContext.getCurrentOrgId();
        if (orgId == null || orgId.isBlank()) orgId = "org-default";
        templateService.deleteTemplate(orgId, id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Preview template rendering with sample values.
     */
    @PostMapping("/preview")
    public ResponseEntity<TemplateSamplePreview> previewTemplate(@RequestBody TemplateRequest request) {
        return ResponseEntity.ok(templateService.previewTemplate(request));
    }

    /**
     * List supported placeholders for intuitive template creation.
     */
    @GetMapping("/placeholders")
    public ResponseEntity<List<String>> getPlaceholders() {
        return ResponseEntity.ok(TemplateService.COMMON_PLACEHOLDERS);
    }
}
