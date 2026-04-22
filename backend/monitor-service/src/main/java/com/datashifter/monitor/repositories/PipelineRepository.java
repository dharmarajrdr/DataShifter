package com.datashifter.monitor.repositories;

import com.datashifter.common.models.Pipeline;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PipelineRepository extends JpaRepository<Pipeline, String> {
}
