package com.datashifter.common.models;

import com.datashifter.common.enums.WorkflowFailureAction;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "workflow_edges", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"workflow_id", "source_pipeline_id", "target_pipeline_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkflowEdge extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workflow_id", nullable = false)
    private Workflow workflow;

    @Column(name = "source_pipeline_id", nullable = false, length = 36)
    private String sourcePipelineId;

    @Column(name = "target_pipeline_id", nullable = false, length = 36)
    private String targetPipelineId;

    @Enumerated(EnumType.STRING)
    @Column(name = "on_failure_action", nullable = false, length = 32)
    @Builder.Default
    private WorkflowFailureAction onFailureAction = WorkflowFailureAction.STOP_WORKFLOW;
}

