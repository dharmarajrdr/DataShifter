package com.datashifter.execution.services.implementations;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * Pushes the latest transformed records into a Redis list (capped at 100).
 * The monitor-service reads this on UI poll to show in-flight records.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class InFlightBufferService {

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    private static final String KEY_PATTERN = "pipeline:%s:inflight";
    private static final long MAX_BUFFER_SIZE = 100;

    /**
     * Push a batch of transformed target records into the buffer.
     * Keeps only the latest 100 records (LIFO — newest at head).
     *
     * OPTIMIZATION: Only serializes and pushes the tail of the batch (last MAX_BUFFER_SIZE),
     * not every record. For a 5000-record chunk, this avoids 4900 unnecessary Redis calls.
     */
    public void pushRecords(String pipelineId, List<Map<String, Object>> records) {
        if (records == null || records.isEmpty()) return;

        String key = String.format(KEY_PATTERN, pipelineId);
        try {
            // Only push the last N records — no point serializing 5000 when we trim to 100
            int start = Math.max(0, records.size() - (int) MAX_BUFFER_SIZE);
            List<Map<String, Object>> tail = records.subList(start, records.size());

            // Batch serialize
            String[] jsonArray = new String[tail.size()];
            for (int i = 0; i < tail.size(); i++) {
                jsonArray[i] = objectMapper.writeValueAsString(tail.get(i));
            }

            // Single Redis operation: delete old, push all at once
            redisTemplate.delete(key);
            if (jsonArray.length > 0) {
                redisTemplate.opsForList().rightPushAll(key, jsonArray);
            }
        } catch (Exception e) {
            log.warn("Failed to push in-flight records to Redis: {}", e.getMessage());
        }
    }

    /**
     * Clear the in-flight buffer for a pipeline (on completion/error/stop).
     */
    public void clear(String pipelineId) {
        redisTemplate.delete(String.format(KEY_PATTERN, pipelineId));
    }
}
