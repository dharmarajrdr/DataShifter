package com.datashifter.common.repositories;

import com.datashifter.common.models.CdcCheckpoint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CommonCdcCheckpointRepository extends JpaRepository<CdcCheckpoint, String> {

    Optional<CdcCheckpoint> findByPipelineId(String pipelineId);

    void deleteByPipelineId(String pipelineId);
}
