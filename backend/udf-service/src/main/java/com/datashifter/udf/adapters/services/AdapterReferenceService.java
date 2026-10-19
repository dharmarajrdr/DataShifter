package com.datashifter.udf.adapters.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Service calculating active pipeline reference counts for adapters (<= 100 lines).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AdapterReferenceService {

    private final JdbcTemplate jdbcTemplate;

    public Map<String, Set<String>> getPipelineReferences() {
        Map<String, Set<String>> map = new HashMap<>();
        try {
            String sql = "SELECT id, source_adapter_id, target_adapter_id FROM pipelines";
            jdbcTemplate.query(sql, rs -> {
                String pId = rs.getString("id");
                String src = rs.getString("source_adapter_id");
                String tgt = rs.getString("target_adapter_id");
                if (src != null && !src.isBlank()) {
                    map.computeIfAbsent(src, k -> new HashSet<>()).add(pId);
                }
                if (tgt != null && !tgt.isBlank()) {
                    map.computeIfAbsent(tgt, k -> new HashSet<>()).add(pId);
                }
            });
        } catch (Exception e) {
            log.warn("Failed to query adapter pipeline references: {}", e.getMessage());
        }
        return map;
    }

    public int countPipelines(String id, String key, Map<String, Set<String>> refMap) {
        if (refMap == null || refMap.isEmpty()) {
            return 0;
        }
        Set<String> distinct = new HashSet<>();
        if (id != null && refMap.containsKey(id)) {
            distinct.addAll(refMap.get(id));
        }
        if (key != null && refMap.containsKey(key)) {
            distinct.addAll(refMap.get(key));
        }
        return distinct.size();
    }

    public int countPipelines(String id, String key) {
        return countPipelines(id, key, getPipelineReferences());
    }
}
