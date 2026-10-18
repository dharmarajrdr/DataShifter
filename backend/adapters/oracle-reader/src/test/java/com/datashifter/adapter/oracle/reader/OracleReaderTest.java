package com.datashifter.adapter.oracle.reader;

import com.datashifter.adapter.sdk.AdapterConfig;
import com.datashifter.adapter.sdk.annotations.AdapterMode;
import com.datashifter.adapter.sdk.annotations.AdapterType;
import com.datashifter.adapter.sdk.annotations.DataShifterAdapter;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class OracleReaderTest {

    @Test
    void testAdapterAnnotationMetadata() {
        DataShifterAdapter annotation = OracleReader.class.getAnnotation(DataShifterAdapter.class);
        assertNotNull(annotation);
        assertEquals("oracle-reader", annotation.id());
        assertEquals("Oracle Reader", annotation.name());
        assertEquals(AdapterType.READER, annotation.type());
        assertEquals(AdapterMode.BATCH, annotation.mode());
        assertEquals("database", annotation.category());
    }

    @Test
    void testAdapterConfigValidation() {
        AdapterConfig config = AdapterConfig.builder()
                .property("host", "oracle.internal")
                .property("port", 1521)
                .property("databaseName", "XEPDB1")
                .property("schemaName", "SALES")
                .property("username", "c##app")
                .property("password", "secret")
                .build();

        assertEquals("oracle.internal", config.getString("host"));
        assertEquals(1521, config.getInteger("port"));
        assertEquals("SALES", config.getString("schemaName"));
    }
}
