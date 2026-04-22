package com.datashifter.monitor.repositories;

import com.datashifter.common.models.ErrorLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ErrorLogRepository extends JpaRepository<ErrorLog, String> {
    Page<ErrorLog> findByPipelineId(String pipelineId, Pageable pageable);
    long countByPipelineId(String pipelineId);
    void deleteByPipelineId(String pipelineId);

    @Query("SELECT e.errorType, COUNT(e) FROM ErrorLog e WHERE e.pipelineId = ?1 GROUP BY e.errorType")
    List<Object[]> countByErrorType(String pipelineId);
}