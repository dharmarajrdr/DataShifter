package com.datashifter.common.repositories;

import com.datashifter.common.models.ExecutionLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;

@Repository
public interface CommonExecutionLogRepository extends JpaRepository<ExecutionLog, String> {

    @Query("SELECT COALESCE(SUM(e.totalRowsProcessed), 0) FROM ExecutionLog e WHERE e.startedAt >= :since AND e.pipelineId IN (SELECT p.id FROM Pipeline p WHERE p.createdBy.organization.id = :orgId)")
    long sumRowsProcessedSince(@Param("orgId") String orgId, @Param("since") Instant since);
}
