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

    private String eventAction;  // COMPLETED, FAILED, STARTED, REMOVED, CREATED, EDITED, UPDATED

    private String eventKey;

    private String priority; // INFO, WARNING, CRITICAL

    @NotBlank(message = "Listener name is required")
    private String name;

    private String description;

    @Builder.Default
    private boolean enabled = true;

    @NotBlank(message = "Channel ID is required")
    private String channelId;

    private String templateId;

    private String filterResourceId; // optional specific resource id

    private java.util.List<String> targetResourceIds; // list of target resources to listen to (e.g. ["ALL"], or specific ids)

    public String getEventAction() {
        if (eventAction != null && !eventAction.isBlank()) return eventAction;
        if (eventKey != null && eventKey.contains(".")) return eventKey.substring(eventKey.indexOf('.') + 1).toUpperCase();
        return eventAction != null ? eventAction : "TRIGGERED";
    }

    public String getEventKey() {
        if (eventKey != null && !eventKey.isBlank()) return eventKey;
        String action = getEventAction();
        return (resourceType != null ? resourceType.toLowerCase() : "custom") + "." + action.toLowerCase();
    }
}
