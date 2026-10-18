package com.datashifter.common.repositories;

import com.datashifter.common.models.ErrorLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CommonErrorLogRepository extends JpaRepository<ErrorLog, String> {
    List<ErrorLog> findByPipelineId(String pipelineId);
    long countByPipelineId(String pipelineId);
    void deleteByPipelineId(String pipelineId);
}
