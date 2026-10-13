package com.datashifter.common.models;

import com.datashifter.common.enums.AiContextType;
import com.datashifter.common.enums.AiPlanStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "ai_execution_plans")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiExecutionPlan extends BaseEntity {

    @Column(name = "session_id", nullable = false, length = 36)
    private String sessionId;

    @Column(name = "org_id", nullable = false, length = 36)
    private String orgId;

    @Column(name = "user_id", nullable = false, length = 36)
    private String userId;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String summary;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    @Builder.Default
    private AiPlanStatus status = AiPlanStatus.PENDING_CONFIRMATION;

    @Enumerated(EnumType.STRING)
    @Column(name = "context_type", length = 32)
    @Builder.Default
    private AiContextType contextType = AiContextType.NONE;

    @Column(name = "context_id", length = 36)
    private String contextId;

    @Column(name = "steps_json", nullable = false, columnDefinition = "TEXT")
    private String stepsJson;

    @Column(name = "execution_log_json", columnDefinition = "TEXT")
    private String executionLogJson;

    @Column(name = "result_entity_type", length = 32)
    private String resultEntityType;

    @Column(name = "result_entity_id", length = 36)
    private String resultEntityId;

    @Column(name = "confirmed_at")
    private Instant confirmedAt;

    @Column(name = "completed_at")
    private Instant completedAt;
}
