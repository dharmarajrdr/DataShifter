package com.datashifter.notification.hub.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ListenerRequest {

    @NotBlank(message = "Resource type is required")
    private String resourceType; // PIPELINE, WORKFLOW, UDF, CONNECTION, SETUP, BEETEL

    @NotBlank(message = "Event action is required")
    private String eventAction;  // COMPLETED, FAILED, STARTED, REMOVED, CREATED, EDITED, UPDATED

    private String eventKey;

    @NotBlank(message = "Listener name is required")
    private String name;

    private String description;

    @Builder.Default
    private boolean enabled = true;

    @NotBlank(message = "Channel ID is required")
    private String channelId;

    private String templateId;

    private String filterResourceId; // optional specific resource id
}
