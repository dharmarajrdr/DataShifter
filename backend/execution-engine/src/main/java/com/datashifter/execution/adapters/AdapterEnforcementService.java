package com.datashifter.execution.adapters;

import com.datashifter.common.enums.DatabaseType;
import com.datashifter.common.enums.PipelineMode;
import com.datashifter.common.exceptions.DatashifterException;
import com.datashifter.common.models.Connection;
import com.datashifter.common.models.Pipeline;
import com.datashifter.common.utils.EncryptionUtil;
import com.datashifter.connector.spi.interfaces.ConnectionConfig;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Enforces adapter resolution and installation verification (<= 100 lines).
 */
@Service @RequiredArgsConstructor @Slf4j
public class AdapterEnforcementService {
    private final AdapterExecutionManager adapterExecutionManager;
    private final ObjectMapper objectMapper;

    public void enforceAdapters(Pipeline pipeline, Connection srcConn, Connection tgtConn,
                                ConnectionConfig srcCfg, ConnectionConfig tgtCfg) {
        String src = resolve(pipeline.getSourceAdapterId(), srcConn != null ? srcConn.getDbType() : (srcCfg != null ? srcCfg.getDbType() : null), pipeline.getPipelineMode(), true);
        String tgt = resolve(pipeline.getTargetAdapterId(), tgtConn != null ? tgtConn.getDbType() : (tgtCfg != null ? tgtCfg.getDbType() : null), pipeline.getPipelineMode(), false);
        pipeline.setSourceAdapterId(src);
        pipeline.setTargetAdapterId(tgt);
        if (pipeline.getSourceConfig() == null || pipeline.getSourceConfig().isBlank()) {
            pipeline.setSourceConfig(buildConfigJson(srcConn, srcCfg));
        }
        if (pipeline.getTargetConfig() == null || pipeline.getTargetConfig().isBlank()) {
            pipeline.setTargetConfig(buildConfigJson(tgtConn, tgtCfg));
        }
        List<String> missing = new ArrayList<>();
        if (!adapterExecutionManager.isAdapterInstalled(src)) missing.add("\"" + src + "\"");
        if (!adapterExecutionManager.isAdapterInstalled(tgt)) missing.add("\"" + tgt + "\"");
        if (!missing.isEmpty()) {
            throw new DatashifterException("Adapter " + String.join(" and ", missing) + " is missing. Please install from Marketplace.");
        }
    }

    public String resolve(String customId, DatabaseType dbType, PipelineMode mode, boolean isSource) {
        return com.datashifter.common.utils.AdapterResolutionUtil.resolve(customId, dbType, mode, isSource);
    }

    public String buildConfigJson(Connection conn, ConnectionConfig cfg) {
        Map<String, Object> m = new LinkedHashMap<>();
        if (cfg != null) {
            if (cfg.getHost() != null) m.put("host", cfg.getHost());
            if (cfg.getPort() != null && cfg.getPort() > 0) m.put("port", cfg.getPort());
            if (cfg.getDatabaseName() != null) m.put("databaseName", cfg.getDatabaseName());
            if (cfg.getSchemaName() != null) m.put("schemaName", cfg.getSchemaName());
            if (cfg.getUsername() != null) m.put("username", cfg.getUsername());
            if (cfg.getPassword() != null) m.put("password", cfg.getPassword());
        }
        if (conn != null) {
            m.put("connectionId", conn.getId());
            if (conn.getHost() != null) m.put("host", conn.getHost());
            if (conn.getPort() != null) m.put("port", conn.getPort());
            if (conn.getDatabaseName() != null) m.put("databaseName", conn.getDatabaseName());
            if (conn.getSchemaName() != null) m.put("schemaName", conn.getSchemaName());
            if (conn.getUsername() != null) m.put("username", conn.getUsername());
            if (conn.getEncryptedPassword() != null) {
                try { m.put("password", EncryptionUtil.decrypt(conn.getEncryptedPassword())); }
                catch (Exception e) { m.put("password", conn.getEncryptedPassword()); }
            }
        }
        try { return objectMapper.writeValueAsString(m); } catch (Exception e) { return "{}"; }
    }
}

