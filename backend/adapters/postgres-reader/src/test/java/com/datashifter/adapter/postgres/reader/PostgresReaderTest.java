package com.datashifter.adapter.postgres.reader;

import com.datashifter.adapter.sdk.AdapterConfig;
import com.datashifter.adapter.sdk.annotations.AdapterMode;
import com.datashifter.adapter.sdk.annotations.AdapterType;
import com.datashifter.adapter.sdk.annotations.DataShifterAdapter;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class PostgresReaderTest {

    @Test
    void testAdapterAnnotationMetadata() {
        DataShifterAdapter annotation = PostgresReader.class.getAnnotation(DataShifterAdapter.class);
        assertNotNull(annotation);
        assertEquals("postgres-reader", annotation.id());
        assertEquals("PostgreSQL Reader", annotation.name());
        assertEquals(AdapterType.READER, annotation.type());
        assertEquals(AdapterMode.BATCH, annotation.mode());
        assertEquals("database", annotation.category());
    }

    @Test
    void testAdapterConfigValidation() {
        AdapterConfig config = AdapterConfig.builder()
                .property("host", "pg.internal")
                .property("port", 5432)
                .property("databaseName", "inventory")
                .property("schemaName", "public")
                .property("username", "postgres")
                .property("password", "secret")
                .build();

        assertEquals("pg.internal", config.getString("host"));
        assertEquals(5432, config.getInteger("port"));
        assertEquals("inventory", config.getString("databaseName"));
        assertEquals("public", config.getString("schemaName"));
    }
}
