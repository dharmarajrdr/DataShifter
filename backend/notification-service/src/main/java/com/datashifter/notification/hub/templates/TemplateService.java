package com.datashifter.notification.hub.templates;

import com.datashifter.notification.hub.dto.TemplateRequest;
import com.datashifter.notification.hub.dto.TemplateSamplePreview;
import com.datashifter.notification.hub.models.NotificationTemplate;
import com.datashifter.notification.hub.repositories.NotificationTemplateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

/**
 * Service managing template lifecycles, validation, and seeded default templates.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class TemplateService {

    private final NotificationTemplateRepository templateRepository;
    private final TemplateEngine templateEngine;

    public static final List<String> COMMON_PLACEHOLDERS = List.of(
            "pipeline_name",
            "pipeline_id",
            "org_id",
            "priority",
            "error_message",
            "error_type",
            "timestamp",
            "action_url"
    );

    @Transactional(readOnly = true)
    public List<NotificationTemplate> listTemplates(String orgId) {
        return templateRepository.findByOrgId(orgId);
    }

    @Transactional(readOnly = true)
    public NotificationTemplate getTemplate(String orgId, String name) {
        return templateRepository.findByOrgIdAndName(orgId, name)
                .orElseGet(() -> getDefaultTemplate(name));
    }

    @Transactional
    public NotificationTemplate createTemplate(String orgId, TemplateRequest request) {
        if (templateRepository.existsByOrgIdAndName(orgId, request.getName())) {
            throw new IllegalArgumentException("Template with name '" + request.getName() + "' already exists in organization.");
        }

        NotificationTemplate template = NotificationTemplate.builder()
                .orgId(orgId)
                .name(request.getName())
                .description(request.getDescription())
                .eventType(request.getEventType() != null ? request.getEventType() : "CUSTOM")
                .channelType(request.getChannelType() != null ? request.getChannelType() : "ALL")
                .subjectTemplate(request.getSubjectTemplate())
                .bodyTemplate(request.getBodyTemplate())
                .build();

        return templateRepository.save(template);
    }

    @Transactional
    public NotificationTemplate updateTemplate(String orgId, String templateId, TemplateRequest request) {
        NotificationTemplate template = templateRepository.findById(templateId)
                .orElseThrow(() -> new NoSuchElementException("Template not found with id: " + templateId));

        if (!template.getOrgId().equals(orgId)) {
            throw new SecurityException("Unauthorized access to template.");
        }

        template.setName(request.getName());
        template.setDescription(request.getDescription());
        template.setEventType(request.getEventType());
        template.setChannelType(request.getChannelType());
        template.setSubjectTemplate(request.getSubjectTemplate());
        template.setBodyTemplate(request.getBodyTemplate());

        return templateRepository.save(template);
    }

    @Transactional
    public void deleteTemplate(String orgId, String templateId) {
        NotificationTemplate template = templateRepository.findById(templateId)
                .orElseThrow(() -> new NoSuchElementException("Template not found with id: " + templateId));

        if (!template.getOrgId().equals(orgId)) {
            throw new SecurityException("Unauthorized access to template.");
        }

        templateRepository.delete(template);
    }

    /**
     * Preview template rendering with sample values.
     */
    public TemplateSamplePreview previewTemplate(TemplateRequest request) {
        Map<String, Object> sampleData = Map.of(
                "pipeline_name", "MySQL_To_Postgres_Production",
                "pipeline_id", "p-9482",
                "priority", "HIGH",
                "error_message", "Connection refused: database server down on port 5432",
                "error_type", "DATABASE_UNAVAILABLE",
                "timestamp", Instant.now().toString(),
                "action_url", "http://localhost:3000/pipelines/p-9482"
        );

        String sampleSubject = request.getSubjectTemplate() != null ?
                templateEngine.render(request.getSubjectTemplate(), sampleData) : "DataShifter Notification";
        String sampleBody = templateEngine.render(request.getBodyTemplate(), sampleData);

        Set<String> placeholders = new HashSet<>(templateEngine.extractPlaceholders(request.getBodyTemplate()));
        if (request.getSubjectTemplate() != null) {
            placeholders.addAll(templateEngine.extractPlaceholders(request.getSubjectTemplate()));
        }

        return TemplateSamplePreview.builder()
                .templateName(request.getName())
                .availablePlaceholders(new ArrayList<>(placeholders))
                .sampleSubject(sampleSubject)
                .sampleBody(sampleBody)
                .build();
    }

    /**
     * Provide built-in fallback default templates if none yet created by user in DB.
     */
    public NotificationTemplate getDefaultTemplate(String name) {
        if ("pipeline-failure-alert".equalsIgnoreCase(name) || "PIPELINE_FAILED".equalsIgnoreCase(name)) {
            return NotificationTemplate.builder()
                    .name("pipeline-failure-alert")
                    .description("Default pipeline failure alert template")
                    .subjectTemplate("[CRITICAL] Pipeline {{pipeline_name}} has failed")
                    .bodyTemplate("Pipeline '{{pipeline_name}}' (ID: {{pipeline_id}}) encountered a failure.\n\nPriority: {{priority}}\nError: {{error_message}}\nTimestamp: {{timestamp}}\n\nPlease inspect the pipeline execution log.")
                    .build();
        }

        if ("pipeline-success".equalsIgnoreCase(name) || "PIPELINE_SUCCESS".equalsIgnoreCase(name)) {
            return NotificationTemplate.builder()
                    .name("pipeline-success")
                    .description("Default pipeline completion template")
                    .subjectTemplate("[SUCCESS] Pipeline {{pipeline_name}} completed successfully")
                    .bodyTemplate("Pipeline '{{pipeline_name}}' (ID: {{pipeline_id}}) completed all table transfers successfully at {{timestamp}}.")
                    .build();
        }

        return NotificationTemplate.builder()
                .name(name)
                .description("Generic alert template")
                .subjectTemplate("DataShifter Alert: {{pipeline_name}}")
                .bodyTemplate("Alert received for {{pipeline_name}}: {{error_message}} (Time: {{timestamp}})")
                .build();
    }
}
