package com.datashifter.notification.hub.dto;

import com.datashifter.notification.hub.models.ChannelType;
import lombok.*;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationRequest {

    private String orgId;
    private String pipelineId;
    private String pipelineName;
    private String templateName;
    private String priority; // LOW, MEDIUM, HIGH, CRITICAL
    private String errorMessage;
    private String errorType;
    private String actionUrl;
    private Map<String, Object> parameters;

    // Optional direct overrides
    private String customSubject;
    private String customMessage;

    // Filter to specific channel types or all configured
    private List<ChannelType> targetChannels;
}
