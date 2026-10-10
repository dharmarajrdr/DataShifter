package com.datashifter.execution.strategies.writers;

import com.datashifter.common.enums.WriteMode;
import com.datashifter.connector.spi.interfaces.ConnectionConfig;
import com.datashifter.connector.spi.interfaces.DatabaseConnector;
import com.datashifter.connector.spi.interfaces.WriteResult;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

class WriteStrategyTest {

    @Test
    void testInsertIgnoreStrategy_FiltersDuplicateErrors() {
        InsertIgnoreStrategy strategy = new InsertIgnoreStrategy();
        assertEquals(WriteMode.INSERT_IGNORE, strategy.getMode());

        DatabaseConnector connector = Mockito.mock(DatabaseConnector.class);
        ConnectionConfig config = Mockito.mock(ConnectionConfig.class);

        List<Map<String, Object>> records = List.of(
                Map.of("id", 1, "name", "Alice"),
                Map.of("id", 2, "name", "Bob"),
                Map.of("id", 3, "name", "Charlie")
        );

        List<WriteResult.FailedRecord> failed = new ArrayList<>();
        failed.add(WriteResult.FailedRecord.builder()
                .errorMessage("ERROR: duplicate key value violates unique constraint 'users_pkey'")
                .record(Map.of("id", 2, "name", "Bob"))
                .build());
        failed.add(WriteResult.FailedRecord.builder()
                .errorMessage("ERROR: column 'invalid' does not exist")
                .record(Map.of("id", 3, "name", "Charlie"))
                .build());

        WriteResult rawResult = WriteResult.builder()
                .totalRecords(3)
                .successCount(1)
                .failureCount(2)
                .failedRecords(failed)
                .build();

        when(connector.writeBatch(eq(config), eq("users"), eq(records), eq("INSERT_IGNORE"), eq("id")))
                .thenReturn(rawResult);

        WriteResult result = strategy.write(connector, config, "users", records, "id");

        assertEquals(3, result.getTotalRecords());
        // Duplicate key was ignored/skipped: successCount goes from 1 -> 2
        assertEquals(2, result.getSuccessCount());
        // Only 1 real failure remains
        assertEquals(1, result.getFailureCount());
        assertEquals(1, result.getFailedRecords().size());
        assertEquals("ERROR: column 'invalid' does not exist", result.getFailedRecords().get(0).getErrorMessage());
    }

    @Test
    void testWriteStrategyFactory_ResolvesAllModes() {
        InsertOnlyStrategy insertOnly = new InsertOnlyStrategy();
        InsertIgnoreStrategy insertIgnore = new InsertIgnoreStrategy();
        UpsertStrategy upsert = new UpsertStrategy();
        UpdateOnlyStrategy updateOnly = new UpdateOnlyStrategy();

        WriteStrategyFactory factory = new WriteStrategyFactory(List.of(insertOnly, insertIgnore, upsert, updateOnly));

        assertSame(insertOnly, factory.getStrategy(WriteMode.INSERT_ONLY));
        assertSame(insertIgnore, factory.getStrategy(WriteMode.INSERT_IGNORE));
        assertSame(upsert, factory.getStrategy(WriteMode.UPSERT));
        assertSame(updateOnly, factory.getStrategy(WriteMode.UPDATE_ONLY));

        assertSame(insertIgnore, factory.getStrategy("INSERT_IGNORE"));
    }
}
