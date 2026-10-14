package com.datashifter.notification.hub.templates;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class TemplateEngineTest {

    private TemplateEngine engine;

    @BeforeEach
    void setUp() {
        engine = new TemplateEngine();
    }

    @Test
    void testRenderWithPlaceholders() {
        String template = "Pipeline {{pipeline_name}} failed on error: {{error_message}} at {{timestamp}}";
        Map<String, Object> values = Map.of(
                "pipeline_name", "Sync-Salesforce",
                "error_message", "Connection timeout",
                "timestamp", "2026-10-13T10:00:00Z"
        );

        String result = engine.render(template, values);
        assertEquals("Pipeline Sync-Salesforce failed on error: Connection timeout at 2026-10-13T10:00:00Z", result);
    }

    @Test
    void testRenderCaseConversionCamelToSnake() {
        String template = "Alert for {{pipeline_name}} (priority: {{priority}})";
        Map<String, Object> values = Map.of(
                "pipelineName", "Orders-Ingest",
                "priority", "HIGH"
        );

        String result = engine.render(template, values);
        assertEquals("Alert for Orders-Ingest (priority: HIGH)", result);
    }

    @Test
    void testExtractPlaceholders() {
        String template = "Hello {{user_name}}, pipeline {{pipeline_id}} has status {{status}}.";
        Set<String> placeholders = engine.extractPlaceholders(template);

        assertEquals(3, placeholders.size());
        assertTrue(placeholders.contains("user_name"));
        assertTrue(placeholders.contains("pipeline_id"));
        assertTrue(placeholders.contains("status"));
    }

    @Test
    void testRenderEmptyOrNullTemplate() {
        assertEquals("", engine.render(null, Map.of()));
        assertEquals("", engine.render("", Map.of()));
        assertEquals("Hello world", engine.render("Hello world", null));
    }
}
