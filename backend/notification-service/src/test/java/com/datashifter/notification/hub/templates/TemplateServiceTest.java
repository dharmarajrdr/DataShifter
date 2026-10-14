package com.datashifter.notification.hub.templates;

import com.datashifter.notification.hub.dto.TemplateRequest;
import com.datashifter.notification.hub.dto.TemplateSamplePreview;
import com.datashifter.notification.hub.models.NotificationTemplate;
import com.datashifter.notification.hub.repositories.NotificationTemplateRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TemplateServiceTest {

    @Mock
    private NotificationTemplateRepository templateRepository;

    @Spy
    private TemplateEngine templateEngine = new TemplateEngine();

    @InjectMocks
    private TemplateService templateService;

    private String orgId = "org-test-123";

    @Test
    void testGetDefaultTemplateWhenNotInDb() {
        when(templateRepository.findByOrgIdAndName(orgId, "pipeline-failure-alert"))
                .thenReturn(Optional.empty());

        NotificationTemplate template = templateService.getTemplate(orgId, "pipeline-failure-alert");
        assertNotNull(template);
        assertEquals("pipeline-failure-alert", template.getName());
        assertTrue(template.getBodyTemplate().contains("{{pipeline_name}}"));
    }

    @Test
    void testCreateTemplateSuccess() {
        TemplateRequest request = TemplateRequest.builder()
                .name("custom-alert")
                .subjectTemplate("Alert: {{pipeline_name}}")
                .bodyTemplate("Error: {{error_message}}")
                .build();

        when(templateRepository.existsByOrgIdAndName(orgId, "custom-alert")).thenReturn(false);
        when(templateRepository.save(any(NotificationTemplate.class))).thenAnswer(invocation -> invocation.getArgument(0));

        NotificationTemplate created = templateService.createTemplate(orgId, request);
        assertNotNull(created);
        assertEquals("custom-alert", created.getName());
        assertEquals("Alert: {{pipeline_name}}", created.getSubjectTemplate());
    }

    @Test
    void testCreateTemplateThrowsWhenDuplicate() {
        TemplateRequest request = TemplateRequest.builder().name("existing-template").bodyTemplate("Body").build();
        when(templateRepository.existsByOrgIdAndName(orgId, "existing-template")).thenReturn(true);

        assertThrows(IllegalArgumentException.class, () -> templateService.createTemplate(orgId, request));
    }

    @Test
    void testPreviewTemplate() {
        TemplateRequest request = TemplateRequest.builder()
                .name("test-preview")
                .subjectTemplate("Alert for {{pipeline_name}}")
                .bodyTemplate("Failed at {{timestamp}} with {{error_message}}")
                .build();

        TemplateSamplePreview preview = templateService.previewTemplate(request);
        assertNotNull(preview);
        assertEquals("test-preview", preview.getTemplateName());
        assertTrue(preview.getSampleSubject().contains("MySQL_To_Postgres_Production"));
        assertTrue(preview.getAvailablePlaceholders().contains("pipeline_name"));
    }
}
