package com.datashifter.notification.hub.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TemplateRequest {

    @NotBlank(message = "Template name is required")
    private String name;

    private String description;

    private String eventType; // PIPELINE_FAILED, PIPELINE_SUCCESS, etc.

    private String channelType; // EMAIL, SLACK, TEAMS, CLIQ, WEBHOOK, ALL

    private String subjectTemplate;

    @NotBlank(message = "Body template is required")
    private String bodyTemplate;
}
