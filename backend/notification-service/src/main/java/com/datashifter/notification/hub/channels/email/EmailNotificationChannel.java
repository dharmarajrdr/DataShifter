package com.datashifter.notification.hub.channels.email;

import com.datashifter.notification.hub.channels.NotificationChannel;
import com.datashifter.notification.hub.dto.NotificationContext;
import com.datashifter.notification.hub.models.ChannelType;
import com.datashifter.notification.hub.models.NotificationChannelConfig;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Properties;

@Component
@Slf4j
public class EmailNotificationChannel implements NotificationChannel {

    private final ObjectMapper objectMapper;
    private final JavaMailSender defaultMailSender;

    @Autowired
    public EmailNotificationChannel(ObjectMapper objectMapper, @Autowired(required = false) JavaMailSender defaultMailSender) {
        this.objectMapper = objectMapper;
        this.defaultMailSender = defaultMailSender;
    }

    @Override
    public ChannelType getChannelType() {
        return ChannelType.EMAIL;
    }

    @Override
    public void validateConfig(NotificationChannelConfig channelConfig) throws IllegalArgumentException {
        Map<String, Object> config = parseConfig(channelConfig.getConfigJson());
        if (!config.containsKey("to") && !config.containsKey("recipients")) {
            throw new IllegalArgumentException("Email channel requires 'to' or 'recipients' field.");
        }
    }

    @Override
    public void send(NotificationChannelConfig channelConfig, NotificationContext context) throws Exception {
        Map<String, Object> config = parseConfig(channelConfig.getConfigJson());

        List<String> recipients = resolveRecipients(config);
        if (recipients.isEmpty()) {
            throw new IllegalArgumentException("No recipient email addresses provided.");
        }

        String from = (String) config.getOrDefault("from", "no-reply@datashifter.io");
        JavaMailSender mailSender = buildMailSender(config);

        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED, StandardCharsets.UTF_8.name());

        helper.setFrom(from);
        helper.setTo(recipients.toArray(new String[0]));
        helper.setSubject(context.getSubject() != null ? context.getSubject() : "DataShifter Notification: " + context.getPipelineName());
        
        // Email body formatted as clean HTML
        String htmlBody = buildHtmlEmail(context);
        helper.setText(htmlBody, true);

        log.info("Sending Email notification to {} recipients via channel '{}'", recipients.size(), channelConfig.getName());
        mailSender.send(message);
    }

    @SuppressWarnings("unchecked")
    private List<String> resolveRecipients(Map<String, Object> config) {
        if (config.containsKey("recipients") && config.get("recipients") instanceof List) {
            return (List<String>) config.get("recipients");
        }
        if (config.containsKey("to")) {
            Object to = config.get("to");
            if (to instanceof List) {
                return (List<String>) to;
            }
            if (to instanceof String) {
                return List.of(((String) to).split("[,;\\s]+"));
            }
        }
        return List.of();
    }

    private JavaMailSender buildMailSender(Map<String, Object> config) {
        if (config.containsKey("host") && config.containsKey("port")) {
            JavaMailSenderImpl impl = new JavaMailSenderImpl();
            impl.setHost((String) config.get("host"));
            impl.setPort(Integer.parseInt(String.valueOf(config.get("port"))));
            if (config.containsKey("username")) {
                impl.setUsername((String) config.get("username"));
            }
            if (config.containsKey("password")) {
                impl.setPassword((String) config.get("password"));
            }
            Properties props = impl.getJavaMailProperties();
            props.put("mail.transport.protocol", "smtp");
            props.put("mail.smtp.auth", String.valueOf(config.getOrDefault("auth", "true")));
            props.put("mail.smtp.starttls.enable", String.valueOf(config.getOrDefault("starttls", "true")));
            return impl;
        }

        if (defaultMailSender != null) {
            return defaultMailSender;
        }

        // Fallback sender if not configured in app
        JavaMailSenderImpl impl = new JavaMailSenderImpl();
        impl.setHost("localhost");
        impl.setPort(25);
        return impl;
    }

    private String buildHtmlEmail(NotificationContext context) {
        String priorityColor = switch (context.getPriority() != null ? context.getPriority().toUpperCase() : "MEDIUM") {
            case "CRITICAL" -> "#DC2626"; // Red
            case "HIGH" -> "#EA580C";     // Orange
            case "LOW" -> "#16A34A";      // Green
            default -> "#2563EB";         // Blue
        };

        return "<div style=\"font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden;\">"
                + "<div style=\"background-color: " + priorityColor + "; padding: 16px; color: #FFFFFF;\">"
                + "<h2 style=\"margin: 0; font-size: 18px;\">DataShifter Alert: " + escapeHtml(context.getPipelineName() != null ? context.getPipelineName() : "Pipeline Alert") + "</h2>"
                + "<span style=\"display: inline-block; margin-top: 4px; font-size: 12px; font-weight: bold; text-transform: uppercase;\">Priority: " + escapeHtml(context.getPriority()) + "</span>"
                + "</div>"
                + "<div style=\"padding: 24px; color: #1F2937;\">"
                + "<p style=\"font-size: 14px; line-height: 1.6; margin-bottom: 20px;\">" + escapeHtml(context.getMessage()).replace("\n", "<br/>") + "</p>"
                + (context.getErrorMessage() != null ? "<div style=\"background-color: #FEF2F2; border-left: 4px solid #EF4444; padding: 12px; margin-bottom: 20px; font-family: monospace; font-size: 13px; color: #991B1B;\">" + escapeHtml(context.getErrorMessage()) + "</div>" : "")
                + (context.getActionUrl() != null ? "<a href=\"" + context.getActionUrl() + "\" style=\"display: inline-block; background-color: #2563EB; color: #FFFFFF; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: 500; font-size: 14px;\">View Pipeline</a>" : "")
                + "</div>"
                + "<div style=\"background-color: #F9FAFB; padding: 12px 24px; font-size: 12px; color: #6B7280; border-top: 1px solid #E5E7EB;\">"
                + "Notification sent by DataShifter NotifyHub at " + (context.getTimestamp() != null ? context.getTimestamp().toString() : "now")
                + "</div>"
                + "</div>";
    }

    private String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }

    private Map<String, Object> parseConfig(String configJson) {
        try {
            return objectMapper.readValue(configJson, new TypeReference<>() {});
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid email config JSON: " + e.getMessage(), e);
        }
    }
}
