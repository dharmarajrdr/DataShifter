package com.datashifter.common.models;

import com.datashifter.common.enums.AiKeyScope;
import com.datashifter.common.enums.AiProviderType;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "ai_api_keys")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiApiKey extends BaseEntity {

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private AiKeyScope scope;

    @Column(name = "user_id", length = 36)
    private String userId;

    @Column(name = "org_id", nullable = false, length = 36)
    private String orgId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    @Builder.Default
    private AiProviderType provider = AiProviderType.GROQ;

    @Column(nullable = false, length = 120)
    private String label;

    @Column(name = "encrypted_api_key", columnDefinition = "TEXT")
    private String encryptedApiKey;

    @Column(name = "masked_key", length = 64)
    private String maskedKey;

    @Column(name = "base_url", length = 255)
    private String baseUrl;

    @Column(name = "model_name", length = 120)
    private String modelName;

    @Column(name = "priority_order", nullable = false)
    @Builder.Default
    private Integer priorityOrder = 0;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(nullable = false, length = 32)
    @Builder.Default
    private String status = "ACTIVE";

    @Column(name = "failure_count", nullable = false)
    @Builder.Default
    private Integer failureCount = 0;

    @Column(name = "last_error", columnDefinition = "TEXT")
    private String lastError;

    @Column(name = "last_used_at")
    private Instant lastUsedAt;

    @Column(name = "last_failed_at")
    private Instant lastFailedAt;

    @Column(name = "cooldown_until")
    private Instant cooldownUntil;
}
