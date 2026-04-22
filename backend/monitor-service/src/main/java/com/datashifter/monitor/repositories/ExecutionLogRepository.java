package com.datashifter.monitor.repositories;

import com.datashifter.common.models.ExecutionLog;
import com.datashifter.common.models.ErrorLog;
import com.datashifter.common.enums.ErrorType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExecutionLogRepository extends JpaRepository<ExecutionLog, String> {
    List<ExecutionLog> findByPipelineIdOrderByStartedAtDesc(String pipelineId);
}
