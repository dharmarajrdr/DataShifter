package com.datashifter.common.models;

import com.datashifter.common.enums.PipelineStatus;
import com.datashifter.common.enums.WriteMode;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "pipelines")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Pipeline extends BaseEntity {

    @Column(nullable = false)
    private String name;

    @Lob
    @Column
    private String description;

    /** Namespace for grouping. Null or empty → assigned to 'Default' namespace */
    @ManyToOne
    private Namespace namespace;

    /** Pipeline creator/owner — populated from auth context in Phase 2 */
    @ManyToOne
    @JoinColumn(name = "created_by")
    private AppUser createdBy;

    @Column(name = "source_connection_id", nullable = false, length = 36)
    private String sourceConnectionId;

    @Column(name = "target_connection_id", nullable = false, length = 36)
    private String targetConnectionId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private PipelineStatus status = PipelineStatus.DRAFT;

    @Column(name = "chunk_size", nullable = false)
    @Builder.Default
    private Integer chunkSize = 10000;

    @Enumerated(EnumType.STRING)
    @Column(name = "default_write_mode", nullable = false, length = 20)
    @Builder.Default
    private WriteMode defaultWriteMode = WriteMode.UPSERT;

    @Column(name = "ignore_exceptions", nullable = false)
    @Builder.Default
    private Boolean ignoreExceptions = false;

    @Column(name = "max_error_threshold", nullable = false)
    @Builder.Default
    private Integer maxErrorThreshold = 1000;

    @Column(name = "log_source_row", nullable = false)
    @Builder.Default
    private Boolean logSourceRow = true;

    /** Number of parallel worker threads. 0 or null = use system default. */
    @Column(name = "parallel_workers")
    @Builder.Default
    private Integer parallelWorkers = 0;

    @Column(name = "source_pool_size")
    @Builder.Default
    private Integer sourcePoolSize = 5;

    @Column(name = "target_pool_size")
    @Builder.Default
    private Integer targetPoolSize = 10;

    @Column(name = "preview_inflight_records")
    @Builder.Default
    private Boolean previewInflightRecords = true;

    @OneToMany(mappedBy = "pipeline", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("executionOrder ASC")
    @Builder.Default
    private Set<PipelineTable> pipelineTables = new LinkedHashSet<>();
}