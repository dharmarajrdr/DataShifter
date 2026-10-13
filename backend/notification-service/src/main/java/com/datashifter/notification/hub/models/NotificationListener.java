package com.datashifter.notification.hub.models;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "notification_listeners")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationListener {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "org_id", nullable = false, length = 36)
    private String orgId;

    @Column(name = "resource_type", nullable = false, length = 50)
    private String resourceType; // PIPELINE, WORKFLOW, UDF, CONNECTION, SETUP, BEETEL

    @Column(name = "event_action", nullable = false, length = 50)
    private String eventAction;  // COMPLETED, FAILED, STARTED, REMOVED, CREATED, EDITED, UPDATED

    @Column(name = "event_key", nullable = false, length = 100)
    private String eventKey;    // e.g. "pipeline.completed", "udf.removed", "connection.edited"

    @Column(nullable = false, length = 150)
    private String name;

    @Column(length = 255)
    private String description;

    @Column(name = "is_enabled")
    @Builder.Default
    private boolean enabled = true;

    @Column(name = "channel_id", nullable = false, length = 36)
    private String channelId;

    @Column(name = "template_id", length = 36)
    private String templateId;

    @Column(name = "filter_resource_id", length = 100)
    private String filterResourceId;

    @Column(name = "target_resource_ids_json", columnDefinition = "TEXT")
    private String targetResourceIdsJson;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    public void onPrePersist() {
        if (id == null) {
            id = java.util.UUID.randomUUID().toString();
        }
        createdAt = Instant.now();
        updatedAt = Instant.now();
    }

    @PreUpdate
    public void onPreUpdate() {
        updatedAt = Instant.now();
    }
}
