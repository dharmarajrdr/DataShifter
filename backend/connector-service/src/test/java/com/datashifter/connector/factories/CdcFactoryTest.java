package com.datashifter.connector.factories;

import com.datashifter.common.cdc.*;
import com.datashifter.common.enums.DatabaseType;
import com.datashifter.common.exceptions.DatashifterException;
import com.datashifter.connector.spi.interfaces.CdcTargetWriter;
import com.datashifter.connector.spi.interfaces.ConnectionConfig;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class CdcFactoryTest {

    @Test
    void testCdcSourceReaderFactory() {
        CdcSourceReader mockOracleReader = new CdcSourceReader() {
            @Override public DatabaseType getSupportedType() { return DatabaseType.ORACLE; }
            @Override public void open(CdcReaderConfig config) {}
            @Override public List<CdcEvent> poll(int maxEvents, Duration timeout) { return List.of(); }
            @Override public void commitCheckpoint(CdcPosition position) {}
            @Override public CdcPosition getCurrentPosition() { return null; }
            @Override public boolean hasNext() { return false; }
            @Override public void close() {}
        };

        CdcSourceReaderFactory factory = new CdcSourceReaderFactory(List.of(mockOracleReader));

        assertTrue(factory.isSupported(DatabaseType.ORACLE));
        assertFalse(factory.isSupported(DatabaseType.POSTGRESQL));
        assertNotNull(factory.getReader(DatabaseType.ORACLE));
        assertEquals(List.of(DatabaseType.ORACLE), factory.getSupportedTypes());

        assertThrows(DatashifterException.class, () -> factory.getReader(DatabaseType.POSTGRESQL));

        CdcSourceReaderFactory realFactory = new CdcSourceReaderFactory(List.of(
                new com.datashifter.connector.spi.adapters.oracle.cdc.OracleTrailFileReader(),
                new com.datashifter.connector.spi.adapters.postgres.cdc.PostgresWalFileReader()
        ));
        assertTrue(realFactory.isSupported(DatabaseType.ORACLE));
        assertTrue(realFactory.isSupported(DatabaseType.POSTGRESQL));
        assertInstanceOf(com.datashifter.connector.spi.adapters.oracle.cdc.OracleTrailFileReader.class, realFactory.getReader(DatabaseType.ORACLE));
        assertInstanceOf(com.datashifter.connector.spi.adapters.postgres.cdc.PostgresWalFileReader.class, realFactory.getReader(DatabaseType.POSTGRESQL));
    }

    @Test
    void testCdcTargetWriterFactory() {
        CdcTargetWriter mockPostgresWriter = new CdcTargetWriter() {
            @Override public DatabaseType getSupportedType() { return DatabaseType.POSTGRESQL; }
            @Override public CdcWriteResult applyBatch(ConnectionConfig config, String targetTable, List<CdcEvent> events, String primaryKeyColumn) {
                return CdcWriteResult.builder().totalEvents(events.size()).appliedInserts(events.size()).build();
            }
        };

        CdcTargetWriterFactory factory = new CdcTargetWriterFactory(List.of(mockPostgresWriter));

        assertTrue(factory.isSupported(DatabaseType.POSTGRESQL));
        assertFalse(factory.isSupported(DatabaseType.ORACLE));
        assertNotNull(factory.getWriter(DatabaseType.POSTGRESQL));

        assertThrows(DatashifterException.class, () -> factory.getWriter(DatabaseType.ORACLE));

        var poolManager = org.mockito.Mockito.mock(com.datashifter.connector.spi.adapters.postgres.ConnectionPoolManager.class);
        CdcTargetWriterFactory realWriterFactory = new CdcTargetWriterFactory(List.of(
                new com.datashifter.connector.spi.adapters.postgres.cdc.PostgresCdcWriter(poolManager),
                new com.datashifter.connector.spi.adapters.oracle.cdc.OracleCdcWriter(poolManager),
                new com.datashifter.connector.spi.adapters.spanner.cdc.SpannerCdcWriter()
        ));

        assertTrue(realWriterFactory.isSupported(DatabaseType.POSTGRESQL));
        assertTrue(realWriterFactory.isSupported(DatabaseType.ORACLE));
        assertTrue(realWriterFactory.isSupported(DatabaseType.SPANNER));
    }
}
