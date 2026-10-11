package com.datashifter.common.models;

import com.datashifter.common.enums.WorkflowNodeOutcome;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "workflow_nodes", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"pipeline_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkflowNode extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workflow_id", nullable = false)
    private Workflow workflow;

    @Column(name = "pipeline_id", nullable = false, unique = true, length = 36)
    private String pipelineId;

    @Column(name = "position_x")
    @Builder.Default
    private Double positionX = 100.0;

    @Column(name = "position_y")
    @Builder.Default
    private Double positionY = 80.0;

    @Enumerated(EnumType.STRING)
    @Column(name = "last_run_outcome", length = 32)
    @Builder.Default
    private WorkflowNodeOutcome lastRunOutcome = WorkflowNodeOutcome.PENDING;
}

