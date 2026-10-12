package com.datashifter.common.models;

import com.datashifter.common.enums.WorkflowStatus;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "workflows")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Workflow extends BaseEntity {

    @Column(name = "org_id", nullable = false, length = 36)
    private String orgId;

    @ManyToOne
    @JoinColumn(name = "namespace_id")
    private Namespace namespace;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    @Builder.Default
    private WorkflowStatus status = WorkflowStatus.DRAFT;

    @Column(name = "current_pipeline_id", length = 36)
    private String currentPipelineId;

    @ManyToOne
    @JoinColumn(name = "created_by")
    private AppUser createdBy;
}

