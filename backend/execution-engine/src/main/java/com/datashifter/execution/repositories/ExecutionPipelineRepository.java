package com.datashifter.execution.repositories;

import com.datashifter.common.models.Pipeline;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ExecutionPipelineRepository extends JpaRepository<Pipeline, String> {

    /**
     * Eagerly fetch the full pipeline graph in one query:
     * Pipeline → PipelineTables → TargetTableMappings → ColumnMappings → Transformations
     * Also loads Filters.
     */
    @Query("SELECT DISTINCT p FROM Pipeline p " +
           "LEFT JOIN FETCH p.pipelineTables pt " +
           "LEFT JOIN FETCH pt.targetTableMappings ttm " +
           "LEFT JOIN FETCH ttm.columnMappings cm " +
           "LEFT JOIN FETCH cm.transformations " +
           "LEFT JOIN FETCH pt.filters " +
           "WHERE p.id = :id")
    Optional<Pipeline> findByIdWithFullGraph(String id);
}
