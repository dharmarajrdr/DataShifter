package com.datashifter.pipeline.services.implementations;

import com.datashifter.common.enums.*;
import com.datashifter.common.events.KafkaTopics;
import com.datashifter.common.events.PipelineEvents.StatusChangeEvent;
import com.datashifter.common.exceptions.DatashifterException;
import com.datashifter.common.models.*;
import com.datashifter.common.repositories.*;
import com.datashifter.common.security.UserContext;
import com.datashifter.common.utils.AdapterResolutionUtil;
import com.datashifter.connector.repositories.ConnectionRepository;
import com.datashifter.pipeline.repositories.PipelineRepository;
import com.datashifter.pipeline.services.interfaces.WorkflowService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.*;
import java.nio.file.*;
import java.time.Instant;
import java.util.*;

@Service @Slf4j
public class PipelineAdapterValidator {
    private final ConnectionRepository connRepo;
    private final PipelineRepository pipeRepo;
    private final CommonErrorLogRepository errRepo;
    private final AdapterDefinitionRepository defRepo;
    private final OrgPurchasedAdapterRepository purchasedRepo;
    private final StringRedisTemplate redis;
    private final KafkaTemplate<String, Object> kafka;
    private final WorkflowService workflowService;
    private final Path storageRoot;
    @Autowired(required = false) private PlatformTransactionManager txManager;

    @Autowired
    public PipelineAdapterValidator(ConnectionRepository connRepo, PipelineRepository pipeRepo, CommonErrorLogRepository errRepo,
            AdapterDefinitionRepository defRepo, OrgPurchasedAdapterRepository purchasedRepo, StringRedisTemplate redis,
            KafkaTemplate<String, Object> kafka, WorkflowService workflowService,
            @Value("${datashifter.adapters.storage.root:${datashifter.udf.storage.root:/var/lib/datashifter/udfs}/adapters}") String root) {
        this.connRepo = connRepo; this.pipeRepo = pipeRepo; this.errRepo = errRepo; this.defRepo = defRepo;
        this.purchasedRepo = purchasedRepo; this.redis = redis; this.kafka = kafka; this.workflowService = workflowService;
        this.storageRoot = Paths.get(root).toAbsolutePath().normalize();
    }

    public void validateAdapters(Pipeline pipeline) {
        Connection srcConn = pipeline.getSourceConnectionId() != null ? connRepo.findById(pipeline.getSourceConnectionId()).orElse(null) : null;
        Connection tgtConn = pipeline.getTargetConnectionId() != null ? connRepo.findById(pipeline.getTargetConnectionId()).orElse(null) : null;
        String src = AdapterResolutionUtil.resolve(pipeline.getSourceAdapterId(), srcConn != null ? srcConn.getDbType() : null, pipeline.getPipelineMode(), true);
        String tgt = AdapterResolutionUtil.resolve(pipeline.getTargetAdapterId(), tgtConn != null ? tgtConn.getDbType() : null, pipeline.getPipelineMode(), false);
        pipeline.setSourceAdapterId(src); pipeline.setTargetAdapterId(tgt);
        String orgId = UserContext.getCurrentOrgId();
        if ((orgId == null || orgId.isBlank()) && pipeline.getCreatedBy() != null && pipeline.getCreatedBy().getOrganization() != null) orgId = pipeline.getCreatedBy().getOrganization().getId();
        List<String> missing = new ArrayList<>();
        if (!isInstalled(src, orgId)) missing.add("\"" + src + "\"");
        if (!isInstalled(tgt, orgId)) missing.add("\"" + tgt + "\"");
        if (!missing.isEmpty()) {
            String msg = "Adapter " + String.join(" and ", missing) + " is missing. Please install from Marketplace.";
            handleMissing(pipeline.getId(), msg);
            throw new DatashifterException(msg);
        }
    }

    public boolean isInstalled(String key, String orgId) {
        if (key == null || key.isBlank()) return false;
        if (orgId != null && !orgId.isBlank()) {
            boolean p = purchasedRepo.isAdapterPurchasedByOrg(orgId, key), c = defRepo.findByOrganizationIdAndAdapterKey(orgId, key).isPresent();
            return (p || c) && checkJar(key, orgId);
        }
        return !defRepo.findAllByAdapterKey(key).isEmpty() && checkJar(key, null);
    }

    private boolean checkJar(String key, String orgId) {
        if (!storageRoot.toFile().exists()) return true;
        if (orgId != null && storageRoot.resolve(orgId).resolve("adapters").resolve(key + ".jar").toFile().exists()) return true;
        return defRepo.findAllByAdapterKey(key).stream().anyMatch(d -> d.getStorageKey() != null && storageRoot.resolve(d.getStorageKey()).toFile().exists());
    }

    public void handleMissing(String pipelineId, String errorMsg) {
        Runnable r = () -> pipeRepo.findById(pipelineId).ifPresent(p -> {
            PipelineStatus prev = p.getStatus(); p.setStatus(PipelineStatus.ERRORED); pipeRepo.save(p);
            if (p.getClearLogsOnStart() == null || p.getClearLogsOnStart()) errRepo.deleteByPipelineId(p.getId());
            errRepo.save(ErrorLog.builder().pipelineId(p.getId()).errorType(ErrorType.ADAPTER_ERROR)
                    .sourceTable("SYSTEM").targetTable("ADAPTER").errorMessage(errorMsg).chunkNumber(0L).rowNumber(0L).build());
            try { redis.opsForHash().put("pipeline:" + p.getId() + ":stats", "errorsSkipped", "1"); } catch (Exception ignored) {}
            kafka.send(KafkaTopics.PIPELINE_STATUS, StatusChangeEvent.builder().pipelineId(p.getId())
                    .previousStatus(prev).newStatus(PipelineStatus.ERRORED).reason(errorMsg).timestamp(Instant.now()).build());
            workflowService.syncWorkflowStatusForPipeline(p.getId());
            log.warn("Marked pipeline {} as ERRORED due to missing adapters: {}", p.getId(), errorMsg);
        });
        if (txManager != null) {
            new TransactionTemplate(txManager, new DefaultTransactionDefinition(TransactionDefinition.PROPAGATION_REQUIRES_NEW)).executeWithoutResult(st -> r.run());
        } else r.run();
    }
}
