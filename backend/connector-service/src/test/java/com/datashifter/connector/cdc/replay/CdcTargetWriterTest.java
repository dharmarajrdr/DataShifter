package com.datashifter.connector.cdc.replay;

import com.datashifter.common.cdc.CdcEvent;
import com.datashifter.common.cdc.CdcPosition;
import com.datashifter.common.cdc.CdcWriteResult;
import com.datashifter.common.enums.CdcOperationType;
import com.datashifter.common.enums.DatabaseType;
import com.datashifter.connector.spi.adapters.oracle.cdc.OracleCdcWriter;
import com.datashifter.connector.spi.adapters.postgres.ConnectionPoolManager;
import com.datashifter.connector.spi.adapters.postgres.cdc.PostgresCdcWriter;
import com.datashifter.connector.spi.adapters.spanner.cdc.SpannerCdcWriter;
import com.datashifter.connector.spi.interfaces.ConnectionConfig;
import com.google.cloud.spanner.Mutation;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class CdcTargetWriterTest {

    private ConnectionPoolManager poolManager;
    private Connection mockConnection;
    private PreparedStatement mockStatement;

    private PostgresCdcWriter postgresWriter;
    private OracleCdcWriter oracleWriter;
    private SpannerCdcWriter spannerWriter;

    private ConnectionConfig pgConfig;
    private ConnectionConfig oracleConfig;

    @BeforeEach
    void setUp() throws SQLException {
        poolManager = mock(ConnectionPoolManager.class);
        mockConnection = mock(Connection.class);
        mockStatement = mock(PreparedStatement.class);

        when(poolManager.getConnection(any(ConnectionConfig.class))).thenReturn(mockConnection);
        when(mockConnection.prepareStatement(anyString())).thenReturn(mockStatement);

        postgresWriter = new PostgresCdcWriter(poolManager);
        oracleWriter = new OracleCdcWriter(poolManager);
        spannerWriter = new SpannerCdcWriter();

        pgConfig = ConnectionConfig.builder().dbType(DatabaseType.POSTGRESQL).build();
        oracleConfig = ConnectionConfig.builder().dbType(DatabaseType.ORACLE).build();
    }

    @Test
    @DisplayName("PostgresCdcWriter: executes ON CONFLICT DO UPDATE upsert")
    void testPostgresUpsert() throws SQLException {
        CdcEvent insertEvent = CdcEvent.builder()
                .eventId("e1")
                .tableName("employees")
                .operationType(CdcOperationType.INSERT)
                .primaryKeyValues(Map.of("id", 101))
                .afterData(new LinkedHashMap<>(Map.of("id", 101, "name", "Alice", "salary", 75000)))
                .build();

        CdcWriteResult result = postgresWriter.applyBatch(pgConfig, "employees", List.of(insertEvent), "id");

        assertEquals(1, result.getAppliedInserts());
        assertEquals(0, result.getFailureCount());

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(mockConnection).prepareStatement(sqlCaptor.capture());

        String sql = sqlCaptor.getValue();
        assertTrue(sql.contains("INSERT INTO employees"));
        assertTrue(sql.contains("ON CONFLICT (\"id\") DO UPDATE SET"));
        assertTrue(sql.contains("\"name\" = EXCLUDED.\"name\""));
        verify(mockStatement).executeUpdate();
        verify(mockConnection).commit();
    }

    @Test
    @DisplayName("PostgresCdcWriter: executes DELETE by primary key")
    void testPostgresDelete() throws SQLException {
        CdcEvent deleteEvent = CdcEvent.builder()
                .eventId("e2")
                .tableName("employees")
                .operationType(CdcOperationType.DELETE)
                .primaryKeyValues(Map.of("id", 102))
                .build();

        CdcWriteResult result = postgresWriter.applyBatch(pgConfig, "employees", List.of(deleteEvent), "id");

        assertEquals(1, result.getAppliedDeletes());
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(mockConnection).prepareStatement(sqlCaptor.capture());

        String sql = sqlCaptor.getValue();
        assertEquals("DELETE FROM employees WHERE \"id\" = ?", sql);
        verify(mockStatement).setObject(1, 102);
    }

    @Test
    @DisplayName("OracleCdcWriter: executes atomic MERGE INTO")
    void testOracleMerge() throws SQLException {
        CdcEvent updateEvent = CdcEvent.builder()
                .eventId("e3")
                .tableName("EMPLOYEES")
                .operationType(CdcOperationType.UPDATE)
                .primaryKeyValues(Map.of("ID", 201))
                .afterData(new LinkedHashMap<>(Map.of("ID", 201, "NAME", "Bob", "SALARY", 82000)))
                .build();

        CdcWriteResult result = oracleWriter.applyBatch(oracleConfig, "EMPLOYEES", List.of(updateEvent), "ID");

        assertEquals(1, result.getAppliedUpdates());
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(mockConnection).prepareStatement(sqlCaptor.capture());

        String sql = sqlCaptor.getValue();
        assertTrue(sql.contains("MERGE INTO EMPLOYEES t USING (SELECT"));
        assertTrue(sql.contains("WHEN MATCHED THEN UPDATE SET"));
        assertTrue(sql.contains("WHEN NOT MATCHED THEN INSERT"));
        verify(mockStatement).executeUpdate();
    }

    @Test
    @DisplayName("SpannerCdcWriter: builds native insertOrUpdate and delete mutations")
    void testSpannerMutations() {
        CdcEvent insertEvent = CdcEvent.builder()
                .eventId("s1")
                .tableName("Customers")
                .operationType(CdcOperationType.INSERT)
                .primaryKeyValues(Map.of("CustomerId", 501L))
                .afterData(Map.of("CustomerId", 501L, "Name", "Charlie"))
                .build();

        Mutation upsert = spannerWriter.buildUpsertMutation("Customers", insertEvent);
        assertNotNull(upsert);
        assertEquals(Mutation.Op.INSERT_OR_UPDATE, upsert.getOperation());
        assertEquals("Customers", upsert.getTable());

        CdcEvent deleteEvent = CdcEvent.builder()
                .eventId("s2")
                .tableName("Customers")
                .operationType(CdcOperationType.DELETE)
                .primaryKeyValues(Map.of("CustomerId", 501L))
                .build();

        Mutation delete = spannerWriter.buildDeleteMutation("Customers", deleteEvent, "CustomerId");
        assertNotNull(delete);
        assertEquals(Mutation.Op.DELETE, delete.getOperation());
    }
}
