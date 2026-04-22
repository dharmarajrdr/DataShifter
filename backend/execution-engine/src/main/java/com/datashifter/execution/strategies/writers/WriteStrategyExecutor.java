package com.datashifter.execution.strategies.writers;

import com.datashifter.common.enums.WriteMode;
import com.datashifter.connector.spi.interfaces.ConnectionConfig;
import com.datashifter.connector.spi.interfaces.DatabaseConnector;
import com.datashifter.connector.spi.interfaces.WriteResult;
import com.datashifter.execution.contexts.ExecutionContext.TargetTableContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Orchestrates the write step in the chunk loop.
 *
 * Usage in ExecutionServiceImpl (replaces direct connector.writeBatch call):
 *
 *   WriteResult result = writeStrategyExecutor.write(
 *       targetConnector, ctx.getTargetConfig(), ttc, targetRecords);
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WriteStrategyExecutor {

    private final WriteStrategyFactory strategyFactory;

    /**
     * Write a batch of records using the correct strategy for the target table's write mode.
     */
    public WriteResult write(DatabaseConnector connector, ConnectionConfig config,
                              TargetTableContext ttc, List<Map<String, Object>> records) {

        if (records.isEmpty()) {
            return WriteResult.builder()
                    .totalRecords(0).successCount(0).failureCount(0).build();
        }

        WriteStrategy strategy = strategyFactory.getStrategy(ttc.getWriteMode());

        log.debug("Writing {} records to {} using {} strategy",
                records.size(), ttc.getTargetTable(), ttc.getWriteMode());

        return strategy.write(connector, config,
                ttc.getTargetTable(), records, ttc.getPrimaryKeyColumn());
    }

    /**
     * Validate write strategy configuration during context build.
     * Call once per TargetTableContext, not per chunk.
     */
    public void validateStrategy(TargetTableContext ttc) {
        WriteStrategy strategy = strategyFactory.getStrategy(ttc.getWriteMode());

        List<String> mappedTargetColumns = ttc.getColumnMappings().stream()
                .filter(m -> m.isMapped())
                .map(m -> m.getTargetColumn())
                .collect(Collectors.toList());

        strategy.validate(ttc.getTargetTable(), ttc.getPrimaryKeyColumn(), mappedTargetColumns);
    }
}