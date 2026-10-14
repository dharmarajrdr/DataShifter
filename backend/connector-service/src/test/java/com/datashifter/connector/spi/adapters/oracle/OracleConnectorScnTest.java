package com.datashifter.connector.spi.adapters.oracle;

import com.datashifter.common.enums.DatabaseType;
import com.datashifter.connector.spi.adapters.postgres.ConnectionPoolManager;
import com.datashifter.connector.spi.interfaces.ConnectionConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OracleConnectorScnTest {

    @Mock
    private ConnectionPoolManager poolManager;

    @Mock
    private Connection connection;

    @Mock
    private PreparedStatement preparedStatement;

    @Mock
    private ResultSet resultSet;

    private OracleConnector oracleConnector;
    private ConnectionConfig connectionConfig;

    @BeforeEach
    void setUp() {
        oracleConnector = new OracleConnector(poolManager);
        connectionConfig = ConnectionConfig.builder()
                .dbType(DatabaseType.ORACLE)
                .host("localhost")
                .port(1521)
                .databaseName("ORCLCDB")
                .schemaName("HR")
                .username("system")
                .password("oracle")
                .maxPoolSize(5)
                .build();
    }

    @Test
    @DisplayName("Successfully queries current SCN from V$DATABASE")
    void testQueryCurrentScnFromVDatabase() throws SQLException {
        when(poolManager.getConnection(any(), anyInt())).thenReturn(connection);
        when(connection.prepareStatement("SELECT CURRENT_SCN FROM V$DATABASE")).thenReturn(preparedStatement);
        when(preparedStatement.executeQuery()).thenReturn(resultSet);
        when(resultSet.next()).thenReturn(true);
        when(resultSet.getLong(1)).thenReturn(2489104250L);

        Optional<Long> scnOpt = oracleConnector.getCurrentSystemChangeNumber(connectionConfig);

        assertTrue(scnOpt.isPresent());
        assertEquals(2489104250L, scnOpt.get());
        assertEquals(Optional.of("2489104250"), oracleConnector.getCurrentSnapshotPosition(connectionConfig));
        verify(connection, times(2)).prepareStatement("SELECT CURRENT_SCN FROM V$DATABASE");
    }


    @Test
    @DisplayName("Falls back to DBMS_FLASHBACK when V$DATABASE is not accessible")
    void testQueryCurrentScnFallbackToDbmsFlashback() throws SQLException {
        when(poolManager.getConnection(any(), anyInt())).thenReturn(connection);
        when(connection.prepareStatement("SELECT CURRENT_SCN FROM V$DATABASE"))
                .thenThrow(new SQLException("ORA-00942: table or view does not exist"));

        PreparedStatement flashbackPs = mock(PreparedStatement.class);
        ResultSet flashbackRs = mock(ResultSet.class);
        when(connection.prepareStatement("SELECT DBMS_FLASHBACK.GET_SYSTEM_CHANGE_NUMBER FROM DUAL"))
                .thenReturn(flashbackPs);
        when(flashbackPs.executeQuery()).thenReturn(flashbackRs);
        when(flashbackRs.next()).thenReturn(true);
        when(flashbackRs.getLong(1)).thenReturn(2489104300L);

        Optional<Long> scnOpt = oracleConnector.getCurrentSystemChangeNumber(connectionConfig);

        assertTrue(scnOpt.isPresent());
        assertEquals(2489104300L, scnOpt.get());
        verify(connection).prepareStatement("SELECT DBMS_FLASHBACK.GET_SYSTEM_CHANGE_NUMBER FROM DUAL");
    }

    @Test
    @DisplayName("Returns empty Optional when both V$DATABASE and DBMS_FLASHBACK fail")
    void testQueryCurrentScnAllFail() throws SQLException {
        when(poolManager.getConnection(any(), anyInt())).thenReturn(connection);
        when(connection.prepareStatement("SELECT CURRENT_SCN FROM V$DATABASE"))
                .thenThrow(new SQLException("ORA-00942"));
        when(connection.prepareStatement("SELECT DBMS_FLASHBACK.GET_SYSTEM_CHANGE_NUMBER FROM DUAL"))
                .thenThrow(new SQLException("ORA-06553"));

        Optional<Long> scnOpt = oracleConnector.getCurrentSystemChangeNumber(connectionConfig);

        assertTrue(scnOpt.isEmpty());
        assertTrue(oracleConnector.getCurrentSnapshotPosition(connectionConfig).isEmpty());
    }
}
