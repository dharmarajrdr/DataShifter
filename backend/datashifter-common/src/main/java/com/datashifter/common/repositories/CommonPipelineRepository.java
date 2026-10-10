package com.datashifter.common.repositories;

import com.datashifter.common.models.Pipeline;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CommonPipelineRepository extends JpaRepository<Pipeline, String> {

    boolean existsBySourceConnectionIdOrTargetConnectionId(String sourceConnectionId, String targetConnectionId);

    @Query("SELECT COUNT(p) FROM Pipeline p WHERE p.sourceConnectionId = :connectionId OR p.targetConnectionId = :connectionId")
    long countByConnectionId(@Param("connectionId") String connectionId);

    @Query("SELECT p.name FROM Pipeline p WHERE p.sourceConnectionId = :connectionId OR p.targetConnectionId = :connectionId")
    List<String> findPipelineNamesByConnectionId(@Param("connectionId") String connectionId);

    @Query("SELECT p.sourceConnectionId, p.targetConnectionId, p.name FROM Pipeline p")
    List<Object[]> findAllPipelineConnectionUsage();
}
