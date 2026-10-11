package com.datashifter.execution.repositories;

import com.datashifter.common.models.ChunkCursor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChunkCursorRepository extends JpaRepository<ChunkCursor, String> {

    Optional<ChunkCursor> findByPipelineIdAndTableName(String pipelineId, String tableName);

    List<ChunkCursor> findByPipelineIdOrderByCurrentTableIndexAsc(String pipelineId);

    @Modifying
    @Transactional
    @Query("DELETE FROM ChunkCursor c WHERE c.pipelineId = :pipelineId")
    void deleteByPipelineId(@Param("pipelineId") String pipelineId);
}