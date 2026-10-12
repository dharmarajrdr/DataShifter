package com.datashifter.common.models;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "ai_chat_messages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiChatMessage extends BaseEntity {

    @Column(name = "session_id", nullable = false, length = 36)
    private String sessionId;

    @Column(nullable = false, length = 32)
    private String role; // USER, ASSISTANT, SYSTEM

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "markdown_file_name")
    private String markdownFileName;

    @Column(name = "markdown_content", columnDefinition = "TEXT")
    private String markdownContent;

    @Column(name = "plan_id", length = 36)
    private String planId;

    @Column(name = "provider_used", length = 64)
    private String providerUsed;

    @Column(name = "model_used", length = 120)
    private String modelUsed;

    @Column(name = "key_source", length = 32)
    private String keySource;

    @Column(name = "metadata_json", columnDefinition = "TEXT")
    private String metadataJson;
}
