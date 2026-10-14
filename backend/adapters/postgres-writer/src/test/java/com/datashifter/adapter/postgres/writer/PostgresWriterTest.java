package com.datashifter.adapter.postgres.writer;

import com.datashifter.adapter.sdk.WriteMode;
import com.datashifter.adapter.sdk.annotations.AdapterMode;
import com.datashifter.adapter.sdk.annotations.AdapterType;
import com.datashifter.adapter.sdk.annotations.DataShifterAdapter;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class PostgresWriterTest {

    private final PostgresSqlBuilder sqlBuilder = new PostgresSqlBuilder();

    @Test
    void testAdapterAnnotationMetadata() {
        DataShifterAdapter annotation = PostgresWriter.class.getAnnotation(DataShifterAdapter.class);
        assertNotNull(annotation);
        assertEquals("postgres-writer", annotation.id());
        assertEquals("PostgreSQL Writer", annotation.name());
        assertEquals(AdapterType.WRITER, annotation.type());
        assertEquals(AdapterMode.BOTH, annotation.mode());
    }

    @Test
    void testBuildInsertSql() {
        String sql = sqlBuilder.buildWriteSql("\"public\".\"orders\"", List.of("id", "customer_name", "amount"), WriteMode.INSERT_ONLY, "id");
        assertEquals("INSERT INTO \"public\".\"orders\" (\"id\", \"customer_name\", \"amount\") VALUES (?, ?, ?)", sql);
    }

    @Test
    void testBuildInsertIgnoreSql() {
        String sql = sqlBuilder.buildWriteSql("\"public\".\"orders\"", List.of("id", "customer_name"), WriteMode.INSERT_IGNORE, "id");
        assertEquals("INSERT INTO \"public\".\"orders\" (\"id\", \"customer_name\") VALUES (?, ?) ON CONFLICT (\"id\") DO NOTHING", sql);
    }

    @Test
    void testBuildUpdateSql() {
        String sql = sqlBuilder.buildWriteSql("\"public\".\"orders\"", List.of("id", "status"), WriteMode.UPDATE_ONLY, "id");
        assertEquals("UPDATE \"public\".\"orders\" SET \"status\" = ? WHERE \"id\" = ?", sql);
    }

    @Test
    void testBuildUpsertSql() {
        String sql = sqlBuilder.buildWriteSql("\"public\".\"orders\"", List.of("id", "status"), WriteMode.UPSERT, "id");
        assertEquals("INSERT INTO \"public\".\"orders\" (\"id\", \"status\") VALUES (?, ?) ON CONFLICT (\"id\") DO UPDATE SET \"status\" = EXCLUDED.\"status\"", sql);
    }

    @Test
    void testBuildDeleteSql() {
        String sql = sqlBuilder.buildDeleteSql("\"public\".\"orders\"", "id");
        assertEquals("DELETE FROM \"public\".\"orders\" WHERE \"id\" = ?", sql);
    }
}
