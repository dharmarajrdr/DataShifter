package com.datashifter.notification.hub.models;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "notification_templates", uniqueConstraints = {
    @UniqueConstraint(name = "uq_template_org_name", columnNames = {"org_id", "name"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationTemplate {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "org_id", nullable = false, length = 36)
    private String orgId;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 255)
    private String description;

    @Column(name = "event_type", length = 100)
    private String eventType;

    @Column(name = "channel_type", length = 50)
    private String channelType; // EMAIL, SLACK, TEAMS, CLIQ, WEBHOOK, or ALL

    @Column(name = "subject_template", length = 255)
    private String subjectTemplate;

    @Column(name = "body_template", nullable = false, columnDefinition = "TEXT")
    private String bodyTemplate;

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
