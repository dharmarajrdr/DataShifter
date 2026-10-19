package com.datashifter.pipeline.services.implementations;

import com.datashifter.common.dtos.CdcDtos.*;
import com.datashifter.common.exceptions.ResourceNotFoundException;
import com.datashifter.common.models.CdcCheckpoint;
import com.datashifter.common.models.Pipeline;
import com.datashifter.common.repositories.CommonCdcCheckpointRepository;
import com.datashifter.pipeline.repositories.PipelineRepository;
import com.datashifter.pipeline.services.interfaces.CdcCheckpointService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
@RequiredArgsConstructor
@Slf4j
public class CdcCheckpointServiceImpl implements CdcCheckpointService {

    private final CommonCdcCheckpointRepository checkpointRepository;
    private final PipelineRepository pipelineRepository;
    private final StringRedisTemplate redisTemplate;

    @Override
    @Transactional(readOnly = true)
    public CdcCheckpointResponse getCheckpoint(String pipelineId) {
        assertPipelineExists(pipelineId);
        return checkpointRepository.findByPipelineId(pipelineId)
                .map(this::toResponse)
                .orElse(null);
    }

    @Override
    @Transactional
    public CdcCheckpointResponse resetCheckpoint(String pipelineId, ResetCdcCheckpointRequest request) {
        assertPipelineExists(pipelineId);

        boolean hasTarget = request != null && (
                (request.getTargetScn() != null && !request.getTargetScn().isBlank()) ||
                (request.getTargetSourceFile() != null && !request.getTargetSourceFile().isBlank()) ||
                request.getTargetLsn() != null ||
                request.getTargetFileOffset() != null
        );

        if (!hasTarget) {
            clearCheckpoint(pipelineId);
            return null;
        }

        CdcCheckpoint checkpoint = checkpointRepository.findByPipelineId(pipelineId)
                .orElse(CdcCheckpoint.builder()
                        .pipelineId(pipelineId)
                        .status("ACTIVE")
                        .build());

        if (request.getTargetSourceFile() != null) checkpoint.setSourceFile(request.getTargetSourceFile());
        if (request.getTargetFileOffset() != null) checkpoint.setFileOffset(request.getTargetFileOffset());
        if (request.getTargetScn() != null && !request.getTargetScn().isBlank()) {
            String scn = request.getTargetScn().trim();
            checkpoint.setLastScn(scn);
            if (scn.contains("/")) {
                try {
                    String[] parts = scn.split("/");
                    long hi = Long.parseUnsignedLong(parts[0], 16);
                    long lo = Long.parseUnsignedLong(parts[1], 16);
                    checkpoint.setLastLsn(String.valueOf((hi << 32) | lo));
                } catch (Exception ignored) {
                    checkpoint.setLastLsn(scn);
                }
            } else {
                checkpoint.setLastLsn(scn);
            }
        }
        if (request.getTargetLsn() != null) checkpoint.setLastLsn(request.getTargetLsn());
        checkpoint.setEventsProcessed(0L);
        checkpoint.setStatus("ACTIVE");
        checkpoint.setCheckpointAt(Instant.now());

        checkpoint = checkpointRepository.save(checkpoint);

        // Invalidate Redis hot cache keys so CDC reader picks up new reset coordinates
        redisTemplate.delete("cdc:checkpoint:" + pipelineId);
        redisTemplate.delete("pipeline:" + pipelineId + ":cdc:checkpoint");
        redisTemplate.delete("pipeline:" + pipelineId + ":stats");
        redisTemplate.delete("pipeline:" + pipelineId + ":inflight");

        log.info("CDC checkpoint reset for pipeline {}: file={}, offset={}, SCN={}, LSN={}",
                pipelineId, checkpoint.getSourceFile(), checkpoint.getFileOffset(),
                checkpoint.getLastScn(), checkpoint.getLastLsn());

        return toResponse(checkpoint);
    }

    @Override
    @Transactional
    public void clearCheckpoint(String pipelineId) {
        assertPipelineExists(pipelineId);
        checkpointRepository.deleteByPipelineId(pipelineId);
        redisTemplate.delete("cdc:checkpoint:" + pipelineId);
        redisTemplate.delete("pipeline:" + pipelineId + ":cdc:checkpoint");
        redisTemplate.delete("pipeline:" + pipelineId + ":stats");
        redisTemplate.delete("pipeline:" + pipelineId + ":inflight");
        log.info("CDC checkpoint cleared for pipeline {}", pipelineId);
    }

    private void assertPipelineExists(String pipelineId) {
        if (!pipelineRepository.existsById(pipelineId)) {
            throw new ResourceNotFoundException("Pipeline", pipelineId);
        }
    }

    private CdcCheckpointResponse toResponse(CdcCheckpoint c) {
        return CdcCheckpointResponse.builder()
                .id(c.getId())
                .pipelineId(c.getPipelineId())
                .executionLogId(c.getExecutionLogId())
                .sourceFile(c.getSourceFile())
                .fileOffset(c.getFileOffset())
                .lastScn(c.getLastScn())
                .lastLsn(c.getLastLsn())
                .txId(c.getTxId())
                .eventsProcessed(c.getEventsProcessed())
                .checkpointAt(c.getCheckpointAt())
                .status(c.getStatus())
                .build();
    }
}
