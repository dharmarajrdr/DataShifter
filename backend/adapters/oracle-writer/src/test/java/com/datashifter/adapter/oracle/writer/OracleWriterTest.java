package com.datashifter.adapter.oracle.writer;

import com.datashifter.adapter.sdk.WriteMode;
import com.datashifter.adapter.sdk.annotations.AdapterMode;
import com.datashifter.adapter.sdk.annotations.AdapterType;
import com.datashifter.adapter.sdk.annotations.DataShifterAdapter;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class OracleWriterTest {

    private final OracleSqlBuilder sqlBuilder = new OracleSqlBuilder();

    @Test
    void testAdapterAnnotationMetadata() {
        DataShifterAdapter annotation = OracleWriter.class.getAnnotation(DataShifterAdapter.class);
        assertNotNull(annotation);
        assertEquals("oracle-writer", annotation.id());
        assertEquals("Oracle Writer", annotation.name());
        assertEquals(AdapterType.WRITER, annotation.type());
        assertEquals(AdapterMode.BOTH, annotation.mode());
    }

    @Test
    void testBuildInsertSql() {
        String sql = sqlBuilder.buildWriteSql("SALES.ORDERS", List.of("ID", "CUSTOMER_NAME", "AMOUNT"), WriteMode.INSERT_ONLY, "ID");
        assertEquals("INSERT INTO SALES.ORDERS (ID, CUSTOMER_NAME, AMOUNT) VALUES (?, ?, ?)", sql);
    }

    @Test
    void testBuildInsertIgnoreSql() {
        String sql = sqlBuilder.buildWriteSql("SALES.ORDERS", List.of("ID", "CUSTOMER_NAME"), WriteMode.INSERT_IGNORE, "ID");
        assertTrue(sql.contains("IGNORE_ROW_ON_DUPKEY_INDEX(SALES.ORDERS(ID))"));
    }

    @Test
    void testBuildUpdateSql() {
        String sql = sqlBuilder.buildWriteSql("SALES.ORDERS", List.of("ID", "STATUS"), WriteMode.UPDATE_ONLY, "ID");
        assertEquals("UPDATE SALES.ORDERS SET STATUS = ? WHERE ID = ?", sql);
    }

    @Test
    void testBuildMergeSql() {
        String sql = sqlBuilder.buildWriteSql("SALES.ORDERS", List.of("ID", "STATUS"), WriteMode.UPSERT, "ID");
        assertTrue(sql.startsWith("MERGE INTO SALES.ORDERS t"));
        assertTrue(sql.contains("ON (t.ID = s.ID)"));
        assertTrue(sql.contains("WHEN MATCHED THEN UPDATE SET t.STATUS = s.STATUS"));
        assertTrue(sql.contains("WHEN NOT MATCHED THEN INSERT (ID, STATUS) VALUES (s.ID, s.STATUS)"));
    }
}
