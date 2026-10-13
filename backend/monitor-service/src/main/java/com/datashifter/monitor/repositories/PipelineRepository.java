package com.datashifter.monitor.repositories;

import com.datashifter.common.models.Pipeline;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository("monitorPipelineRepository")
public interface PipelineRepository extends JpaRepository<Pipeline, String> {
}
