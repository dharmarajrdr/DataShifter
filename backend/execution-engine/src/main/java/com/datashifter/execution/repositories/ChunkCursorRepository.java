package com.datashifter.execution.repositories;

import com.datashifter.common.models.ChunkCursor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChunkCursorRepository extends JpaRepository<ChunkCursor, String> {

    Optional<ChunkCursor> findByPipelineIdAndTableName(String pipelineId, String tableName);

    List<ChunkCursor> findByPipelineIdOrderByCurrentTableIndexAsc(String pipelineId);

    void deleteByPipelineId(String pipelineId);
}