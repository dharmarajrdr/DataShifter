package com.datashifter.notification.hub.dto;

import com.datashifter.notification.hub.models.ChannelType;
import lombok.*;

import java.time.Instant;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationContext {

    private String notificationId;
    private String orgId;
    private String pipelineId;
    private String pipelineName;
    private String templateName;
    private String priority;
    private String errorMessage;
    private String errorType;
    private String actionUrl;
    private Instant timestamp;
    private Map<String, Object> parameters;

    /**
     * Rendered content from template engine
     */
    private String subject;
    private String message;
}
