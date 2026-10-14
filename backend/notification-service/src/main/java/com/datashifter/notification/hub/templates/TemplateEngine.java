package com.datashifter.notification.hub.templates;

import org.springframework.stereotype.Component;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * High-performance template rendering engine supporting {{placeholder}} syntax.
 * Replaces placeholders with supplied context parameters or defaults.
 */
@Component
public class TemplateEngine {

    private static final Pattern PLACEHOLDER_PATTERN = Pattern.compile("\\{\\{([^}]+)\\}\\}");

    /**
     * Render template string by substituting all {{placeholder}} variables.
     *
     * @param templateContent Template with placeholders like {{pipeline_name}}
     * @param values          Map of available replacement values
     * @return Rendered string
     */
    public String render(String templateContent, Map<String, Object> values) {
        if (templateContent == null || templateContent.isEmpty()) {
            return "";
        }
        if (values == null || values.isEmpty()) {
            return templateContent;
        }

        Matcher matcher = PLACEHOLDER_PATTERN.matcher(templateContent);
        StringBuilder sb = new StringBuilder();

        while (matcher.find()) {
            String key = matcher.group(1).trim();
            Object val = findValue(values, key);
            String replacement = val != null ? String.valueOf(val) : matcher.group(0);
            matcher.appendReplacement(sb, Matcher.quoteReplacement(replacement));
        }
        matcher.appendTail(sb);
        return sb.toString();
    }

    /**
     * Extract all unique placeholder names used in a template.
     */
    public Set<String> extractPlaceholders(String templateContent) {
        if (templateContent == null) return Collections.emptySet();
        Set<String> placeholders = new LinkedHashSet<>();
        Matcher matcher = PLACEHOLDER_PATTERN.matcher(templateContent);
        while (matcher.find()) {
            placeholders.add(matcher.group(1).trim());
        }
        return placeholders;
    }

    private Object findValue(Map<String, Object> values, String key) {
        // Direct key lookup
        if (values.containsKey(key)) {
            return values.get(key);
        }
        // Normalize snake_case <-> camelCase
        String camelKey = toCamelCase(key);
        if (values.containsKey(camelKey)) {
            return values.get(camelKey);
        }
        String snakeKey = toSnakeCase(key);
        if (values.containsKey(snakeKey)) {
            return values.get(snakeKey);
        }
        return null;
    }

    private String toCamelCase(String snake) {
        StringBuilder sb = new StringBuilder();
        boolean nextUpper = false;
        for (char c : snake.toCharArray()) {
            if (c == '_') {
                nextUpper = true;
            } else if (nextUpper) {
                sb.append(Character.toUpperCase(c));
                nextUpper = false;
            } else {
                sb.append(c);
            }
        }
        return sb.toString();
    }

    private String toSnakeCase(String camel) {
        StringBuilder sb = new StringBuilder();
        for (char c : camel.toCharArray()) {
            if (Character.isUpperCase(c)) {
                sb.append('_').append(Character.toLowerCase(c));
            } else {
                sb.append(c);
            }
        }
        return sb.toString();
    }
}
