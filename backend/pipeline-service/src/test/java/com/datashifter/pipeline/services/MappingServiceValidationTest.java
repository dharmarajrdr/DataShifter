package com.datashifter.pipeline.services;

import com.datashifter.common.dtos.ConnectionDtos.ColumnMetadata;
import com.datashifter.common.enums.DatabaseType;
import com.datashifter.common.enums.TransformFunction;
import com.datashifter.common.enums.WriteMode;
import com.datashifter.common.models.*;
import com.datashifter.connector.factories.ConnectorFactory;
import com.datashifter.connector.repositories.ConnectionRepository;
import com.datashifter.connector.spi.interfaces.ConnectionConfig;
import com.datashifter.connector.spi.interfaces.DatabaseConnector;
import com.datashifter.pipeline.repositories.PipelineRepository;
import com.datashifter.pipeline.services.implementations.MappingService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MappingServiceValidationTest {

    @Mock
    private PipelineRepository pipelineRepository;
    @Mock
    private ConnectorFactory connectorFactory;
    @Mock
    private ConnectionRepository connectionRepository;
    @Mock
    private DatabaseConnector databaseConnector;

    private MappingService mappingService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mappingService = new MappingService(pipelineRepository, connectorFactory, connectionRepository, objectMapper);
    }

    @Test
    void testValidationFailsWhenNotNullColumnIsUnmapped() throws Exception {
        String targetConnId = "conn-target-1";
        Connection targetConn = Connection.builder()
                .dbType(DatabaseType.POSTGRESQL)
                .host("localhost")
                .port(5432)
                .databaseName("testdb")
                .encryptedPassword(com.datashifter.common.utils.EncryptionUtil.encrypt("test"))
                .build();
        targetConn.setId(targetConnId);

        when(connectionRepository.findById(targetConnId)).thenReturn(Optional.of(targetConn));
        when(connectorFactory.getConnector(DatabaseType.POSTGRESQL)).thenReturn(databaseConnector);

        List<ColumnMetadata> targetCols = List.of(
                ColumnMetadata.builder().columnName("id").dataType("bigint").nullable(false).primaryKey(true).build(),
                ColumnMetadata.builder().columnName("name").dataType("varchar").nullable(false).primaryKey(false).build(),
                ColumnMetadata.builder().columnName("bio").dataType("text").nullable(true).primaryKey(false).build()
        );
        when(databaseConnector.getColumns(any(ConnectionConfig.class), eq("users"))).thenReturn(targetCols);

        Pipeline pipeline = Pipeline.builder()
                .targetConnectionId(targetConnId)
                .build();

        PipelineTable pt = PipelineTable.builder()
                .pipeline(pipeline)
                .sourceTable("src_users")
                .build();

        TargetTableMapping ttm = TargetTableMapping.builder()
                .pipelineTable(pt)
                .targetTable("users")
                .writeMode(WriteMode.INSERT_IGNORE)
                .build();

        // Only id is mapped, 'name' (NOT NULL) is unmapped
        ColumnMapping cm = ColumnMapping.builder()
                .targetTableMapping(ttm)
                .sourceColumn("id")
                .targetColumn("id")
                .build();
        ttm.getColumnMappings().add(cm);
        pt.getTargetTableMappings().add(ttm);
        pipeline.getPipelineTables().add(pt);

        List<String> errors = mappingService.validatePipeline(pipeline);

        assertFalse(errors.isEmpty());
        assertTrue(errors.stream().anyMatch(e -> e.contains("name") && e.contains("NOT NULL")));
    }

    @Test
    void testValidationPassesWhenAllNotNullColumnsMapped() throws Exception {
        String targetConnId = "conn-target-1";
        Connection targetConn = Connection.builder()
                .dbType(DatabaseType.POSTGRESQL)
                .host("localhost")
                .port(5432)
                .databaseName("testdb")
                .encryptedPassword(com.datashifter.common.utils.EncryptionUtil.encrypt("test"))
                .build();
        targetConn.setId(targetConnId);

        when(connectionRepository.findById(targetConnId)).thenReturn(Optional.of(targetConn));
        when(connectorFactory.getConnector(DatabaseType.POSTGRESQL)).thenReturn(databaseConnector);

        List<ColumnMetadata> targetCols = List.of(
                ColumnMetadata.builder().columnName("id").dataType("bigint").nullable(false).primaryKey(true).build(),
                ColumnMetadata.builder().columnName("name").dataType("varchar").nullable(false).primaryKey(false).build(),
                ColumnMetadata.builder().columnName("bio").dataType("text").nullable(true).primaryKey(false).build()
        );
        when(databaseConnector.getColumns(any(ConnectionConfig.class), eq("users"))).thenReturn(targetCols);

        Pipeline pipeline = Pipeline.builder()
                .targetConnectionId(targetConnId)
                .build();

        PipelineTable pt = PipelineTable.builder()
                .pipeline(pipeline)
                .sourceTable("src_users")
                .build();

        TargetTableMapping ttm = TargetTableMapping.builder()
                .pipelineTable(pt)
                .targetTable("users")
                .writeMode(WriteMode.INSERT_IGNORE)
                .build();

        ttm.getColumnMappings().add(ColumnMapping.builder().targetTableMapping(ttm).sourceColumn("id").targetColumn("id").build());
        ttm.getColumnMappings().add(ColumnMapping.builder().targetTableMapping(ttm).sourceColumn("name").targetColumn("name").build());
        pt.getTargetTableMappings().add(ttm);
        pipeline.getPipelineTables().add(pt);

        List<String> errors = mappingService.validatePipeline(pipeline);

        assertTrue(errors.isEmpty(), "Expected no validation errors, got: " + errors);
    }

    @Test
    void testValidationFailsWhenNotNullColumnMappingHasNoSourceAndNoSystemValue() throws Exception {
        String targetConnId = "conn-target-1";
        Connection targetConn = Connection.builder()
                .dbType(DatabaseType.POSTGRESQL)
                .host("localhost")
                .port(5432)
                .databaseName("testdb")
                .encryptedPassword(com.datashifter.common.utils.EncryptionUtil.encrypt("test"))
                .build();
        targetConn.setId(targetConnId);

        when(connectionRepository.findById(targetConnId)).thenReturn(Optional.of(targetConn));
        when(connectorFactory.getConnector(DatabaseType.POSTGRESQL)).thenReturn(databaseConnector);

        List<ColumnMetadata> targetCols = List.of(
                ColumnMetadata.builder().columnName("id").dataType("bigint").nullable(false).primaryKey(true).build(),
                ColumnMetadata.builder().columnName("name").dataType("varchar").nullable(false).primaryKey(false).build()
        );
        when(databaseConnector.getColumns(any(ConnectionConfig.class), eq("users"))).thenReturn(targetCols);

        Pipeline pipeline = Pipeline.builder().targetConnectionId(targetConnId).build();
        PipelineTable pt = PipelineTable.builder().pipeline(pipeline).sourceTable("src_users").build();
        TargetTableMapping ttm = TargetTableMapping.builder().pipelineTable(pt).targetTable("users").writeMode(WriteMode.INSERT_IGNORE).build();

        // 'id' is mapped from source, but 'name' entry has NO source, NO default value, and NO system value
        ttm.getColumnMappings().add(ColumnMapping.builder().targetTableMapping(ttm).sourceColumn("id").targetColumn("id").build());
        ttm.getColumnMappings().add(ColumnMapping.builder().targetTableMapping(ttm).sourceColumn(null).targetColumn("name").build());
        pt.getTargetTableMappings().add(ttm);
        pipeline.getPipelineTables().add(pt);

        List<String> errors = mappingService.validatePipeline(pipeline);

        assertFalse(errors.isEmpty());
        assertTrue(errors.stream().anyMatch(e -> e.contains("name") && e.contains("NOT NULL")));
    }

    @Test
    void testValidationPassesWhenNotNullColumnHasSystemValue() throws Exception {
        String targetConnId = "conn-target-1";
        Connection targetConn = Connection.builder()
                .dbType(DatabaseType.POSTGRESQL)
                .host("localhost")
                .port(5432)
                .databaseName("testdb")
                .encryptedPassword(com.datashifter.common.utils.EncryptionUtil.encrypt("test"))
                .build();
        targetConn.setId(targetConnId);

        when(connectionRepository.findById(targetConnId)).thenReturn(Optional.of(targetConn));
        when(connectorFactory.getConnector(DatabaseType.POSTGRESQL)).thenReturn(databaseConnector);

        List<ColumnMetadata> targetCols = List.of(
                ColumnMetadata.builder().columnName("id").dataType("bigint").nullable(false).primaryKey(true).build(),
                ColumnMetadata.builder().columnName("created_at").dataType("timestamp").nullable(false).primaryKey(false).build()
        );
        when(databaseConnector.getColumns(any(ConnectionConfig.class), eq("users"))).thenReturn(targetCols);

        Pipeline pipeline = Pipeline.builder().targetConnectionId(targetConnId).build();
        PipelineTable pt = PipelineTable.builder().pipeline(pipeline).sourceTable("src_users").build();
        TargetTableMapping ttm = TargetTableMapping.builder().pipelineTable(pt).targetTable("users").writeMode(WriteMode.INSERT_IGNORE).build();

        ttm.getColumnMappings().add(ColumnMapping.builder().targetTableMapping(ttm).sourceColumn("id").targetColumn("id").build());
        ttm.getColumnMappings().add(ColumnMapping.builder()
                .targetTableMapping(ttm)
                .sourceColumn(null)
                .targetColumn("created_at")
                .transformations(Set.of(Transformation.builder().functionName(TransformFunction.CURRENT_TIMESTAMP).build()))
                .build());
        pt.getTargetTableMappings().add(ttm);
        pipeline.getPipelineTables().add(pt);

        List<String> errors = mappingService.validatePipeline(pipeline);

        assertTrue(errors.isEmpty(), "Expected no validation errors with CURRENT_TIMESTAMP system value, got: " + errors);
    }

    @Test
    void testValidationFailsWhenStaticValueArgumentIsBlank() throws Exception {
        String targetConnId = "conn-target-1";
        Connection targetConn = Connection.builder()
                .dbType(DatabaseType.POSTGRESQL)
                .host("localhost")
                .port(5432)
                .databaseName("testdb")
                .encryptedPassword(com.datashifter.common.utils.EncryptionUtil.encrypt("test"))
                .build();
        targetConn.setId(targetConnId);

        when(connectionRepository.findById(targetConnId)).thenReturn(Optional.of(targetConn));
        when(connectorFactory.getConnector(DatabaseType.POSTGRESQL)).thenReturn(databaseConnector);

        List<ColumnMetadata> targetCols = List.of(
                ColumnMetadata.builder().columnName("id").dataType("bigint").nullable(false).primaryKey(true).build(),
                ColumnMetadata.builder().columnName("status").dataType("varchar").nullable(false).primaryKey(false).build()
        );
        when(databaseConnector.getColumns(any(ConnectionConfig.class), eq("users"))).thenReturn(targetCols);

        Pipeline pipeline = Pipeline.builder().targetConnectionId(targetConnId).build();
        PipelineTable pt = PipelineTable.builder().pipeline(pipeline).sourceTable("src_users").build();
        TargetTableMapping ttm = TargetTableMapping.builder().pipelineTable(pt).targetTable("users").writeMode(WriteMode.INSERT_IGNORE).build();

        ttm.getColumnMappings().add(ColumnMapping.builder().targetTableMapping(ttm).sourceColumn("id").targetColumn("id").build());
        ttm.getColumnMappings().add(ColumnMapping.builder()
                .targetTableMapping(ttm)
                .sourceColumn(null)
                .targetColumn("status")
                .transformations(Set.of(Transformation.builder().functionName(TransformFunction.STATIC_VALUE).arguments("   ").build()))
                .build());
        pt.getTargetTableMappings().add(ttm);
        pipeline.getPipelineTables().add(pt);

        List<String> errors = mappingService.validatePipeline(pipeline);

        assertFalse(errors.isEmpty());
        assertTrue(errors.stream().anyMatch(e -> e.contains("status") && e.contains("NOT NULL")));
    }

    @Test
    void testStep2FailsWhenNumberMappedDirectlyToTimestamp() {
        String sourceConnId = "conn-source-pg";
        String targetConnId = "conn-target-ora";

        Connection sourceConn = Connection.builder()
                .dbType(DatabaseType.POSTGRESQL)
                .host("localhost").port(5432).databaseName("srcdb")
                .encryptedPassword(com.datashifter.common.utils.EncryptionUtil.encrypt("test"))
                .build();
        sourceConn.setId(sourceConnId);

        Connection targetConn = Connection.builder()
                .dbType(DatabaseType.ORACLE)
                .host("localhost").port(1521).databaseName("ORCL")
                .encryptedPassword(com.datashifter.common.utils.EncryptionUtil.encrypt("test"))
                .build();
        targetConn.setId(targetConnId);

        DatabaseConnector sourceConnector = mock(DatabaseConnector.class);
        DatabaseConnector targetConnector = mock(DatabaseConnector.class);

        when(connectionRepository.findById(sourceConnId)).thenReturn(Optional.of(sourceConn));
        when(connectionRepository.findById(targetConnId)).thenReturn(Optional.of(targetConn));
        when(connectorFactory.getConnector(DatabaseType.POSTGRESQL)).thenReturn(sourceConnector);
        when(connectorFactory.getConnector(DatabaseType.ORACLE)).thenReturn(targetConnector);

        List<ColumnMetadata> sourceCols = List.of(
                ColumnMetadata.builder().columnName("id").dataType("BIGINT").nullable(false).primaryKey(true).build(),
                ColumnMetadata.builder().columnName("epoch_ms").dataType("NUMERIC").nullable(false).primaryKey(false).build()
        );
        List<ColumnMetadata> targetCols = List.of(
                ColumnMetadata.builder().columnName("ID").dataType("NUMBER").nullable(false).primaryKey(true).build(),
                ColumnMetadata.builder().columnName("CREATED_AT").dataType("TIMESTAMP(6)").nullable(false).primaryKey(false).build()
        );

        when(sourceConnector.getColumns(any(ConnectionConfig.class), eq("events"))).thenReturn(sourceCols);
        when(targetConnector.getColumns(any(ConnectionConfig.class), eq("EVENTS_TARGET"))).thenReturn(targetCols);

        Pipeline pipeline = Pipeline.builder()
                .sourceConnectionId(sourceConnId)
                .targetConnectionId(targetConnId)
                .build();

        PipelineTable pt = PipelineTable.builder().pipeline(pipeline).sourceTable("events").build();
        TargetTableMapping ttm = TargetTableMapping.builder()
                .pipelineTable(pt).targetTable("EVENTS_TARGET").writeMode(WriteMode.UPSERT).build();

        ttm.getColumnMappings().add(ColumnMapping.builder()
                .targetTableMapping(ttm).sourceColumn("id").targetColumn("ID").mappingOrder(0).build());
        ttm.getColumnMappings().add(ColumnMapping.builder()
                .targetTableMapping(ttm).sourceColumn("epoch_ms").targetColumn("CREATED_AT").mappingOrder(1).build());

        pt.getTargetTableMappings().add(ttm);
        pipeline.getPipelineTables().add(pt);

        List<String> errors = mappingService.validatePipeline(pipeline);

        assertEquals(1, errors.size());
        assertTrue(errors.get(0).contains("Data type mismatch"), "Expected data type mismatch error, got: " + errors.get(0));
        assertTrue(errors.get(0).contains("CREATED_AT"));
    }

    @Test
    void testStep1ShortCircuitsBeforeStep2WhenNotNullColumnUnmapped() {
        String sourceConnId = "conn-source-pg";
        String targetConnId = "conn-target-ora";

        Connection sourceConn = Connection.builder()
                .dbType(DatabaseType.POSTGRESQL)
                .host("localhost").port(5432).databaseName("srcdb")
                .encryptedPassword(com.datashifter.common.utils.EncryptionUtil.encrypt("test"))
                .build();
        sourceConn.setId(sourceConnId);

        Connection targetConn = Connection.builder()
                .dbType(DatabaseType.ORACLE)
                .host("localhost").port(1521).databaseName("ORCL")
                .encryptedPassword(com.datashifter.common.utils.EncryptionUtil.encrypt("test"))
                .build();
        targetConn.setId(targetConnId);

        DatabaseConnector targetConnector = mock(DatabaseConnector.class);
        when(connectionRepository.findById(sourceConnId)).thenReturn(Optional.of(sourceConn));
        when(connectionRepository.findById(targetConnId)).thenReturn(Optional.of(targetConn));
        when(connectorFactory.getConnector(DatabaseType.ORACLE)).thenReturn(targetConnector);

        List<ColumnMetadata> targetCols = List.of(
                ColumnMetadata.builder().columnName("ID").dataType("NUMBER").nullable(false).primaryKey(true).build(),
                ColumnMetadata.builder().columnName("NAME").dataType("VARCHAR2").nullable(false).primaryKey(false).build(),
                ColumnMetadata.builder().columnName("CREATED_AT").dataType("TIMESTAMP(6)").nullable(true).primaryKey(false).build()
        );
        when(targetConnector.getColumns(any(ConnectionConfig.class), eq("EVENTS_TARGET"))).thenReturn(targetCols);

        Pipeline pipeline = Pipeline.builder()
                .sourceConnectionId(sourceConnId)
                .targetConnectionId(targetConnId)
                .build();

        PipelineTable pt = PipelineTable.builder().pipeline(pipeline).sourceTable("events").build();
        TargetTableMapping ttm = TargetTableMapping.builder()
                .pipelineTable(pt).targetTable("EVENTS_TARGET").writeMode(WriteMode.UPSERT).build();

        // NAME (NOT NULL) is unmapped, AND CREATED_AT has a type mismatch (NUMBER -> TIMESTAMP)
        ttm.getColumnMappings().add(ColumnMapping.builder()
                .targetTableMapping(ttm).sourceColumn("id").sourceType("BIGINT").targetColumn("ID").mappingOrder(0).build());
        ttm.getColumnMappings().add(ColumnMapping.builder()
                .targetTableMapping(ttm).sourceColumn("epoch_ms").sourceType("NUMERIC").targetColumn("CREATED_AT").mappingOrder(1).build());

        pt.getTargetTableMappings().add(ttm);
        pipeline.getPipelineTables().add(pt);

        List<String> errors = mappingService.validatePipeline(pipeline);

        // Step 1 must short-circuit and report only the missing NOT NULL mapping, not Step 2 type mismatch
        assertEquals(1, errors.size());
        assertTrue(errors.get(0).contains("NOT NULL"));
        assertFalse(errors.get(0).contains("Data type mismatch"));
    }

    @Test
    void testStep2PassesWithBuiltInTransformsAndSkipsUdfMappings() {
        String sourceConnId = "conn-source-pg";
        String targetConnId = "conn-target-ora";

        Connection sourceConn = Connection.builder()
                .dbType(DatabaseType.POSTGRESQL)
                .host("localhost").port(5432).databaseName("srcdb")
                .encryptedPassword(com.datashifter.common.utils.EncryptionUtil.encrypt("test"))
                .build();
        sourceConn.setId(sourceConnId);

        Connection targetConn = Connection.builder()
                .dbType(DatabaseType.ORACLE)
                .host("localhost").port(1521).databaseName("ORCL")
                .encryptedPassword(com.datashifter.common.utils.EncryptionUtil.encrypt("test"))
                .build();
        targetConn.setId(targetConnId);

        DatabaseConnector sourceConnector = mock(DatabaseConnector.class);
        DatabaseConnector targetConnector = mock(DatabaseConnector.class);

        when(connectionRepository.findById(sourceConnId)).thenReturn(Optional.of(sourceConn));
        when(connectionRepository.findById(targetConnId)).thenReturn(Optional.of(targetConn));
        when(connectorFactory.getConnector(DatabaseType.POSTGRESQL)).thenReturn(sourceConnector);
        when(connectorFactory.getConnector(DatabaseType.ORACLE)).thenReturn(targetConnector);

        List<ColumnMetadata> sourceCols = List.of(
                ColumnMetadata.builder().columnName("id").dataType("BIGINT").nullable(false).primaryKey(true).build(),
                ColumnMetadata.builder().columnName("date_str").dataType("VARCHAR").nullable(false).primaryKey(false).build(),
                ColumnMetadata.builder().columnName("is_active").dataType("BOOLEAN").nullable(false).primaryKey(false).build(),
                ColumnMetadata.builder().columnName("epoch_ms").dataType("BIGINT").nullable(false).primaryKey(false).build()
        );
        List<ColumnMetadata> targetCols = List.of(
                ColumnMetadata.builder().columnName("ID").dataType("NUMBER").nullable(false).primaryKey(true).build(),
                ColumnMetadata.builder().columnName("EVENT_DATE").dataType("TIMESTAMP(6)").nullable(false).primaryKey(false).build(),
                ColumnMetadata.builder().columnName("ACTIVE_FLAG").dataType("NUMBER").nullable(false).primaryKey(false).build(),
                ColumnMetadata.builder().columnName("UDF_TIMESTAMP").dataType("TIMESTAMP(6)").nullable(false).primaryKey(false).build()
        );

        when(sourceConnector.getColumns(any(ConnectionConfig.class), eq("events"))).thenReturn(sourceCols);
        when(targetConnector.getColumns(any(ConnectionConfig.class), eq("EVENTS_TARGET"))).thenReturn(targetCols);

        Pipeline pipeline = Pipeline.builder()
                .sourceConnectionId(sourceConnId)
                .targetConnectionId(targetConnId)
                .build();

        PipelineTable pt = PipelineTable.builder().pipeline(pipeline).sourceTable("events").build();
        TargetTableMapping ttm = TargetTableMapping.builder()
                .pipelineTable(pt).targetTable("EVENTS_TARGET").writeMode(WriteMode.UPSERT).build();

        // 1. BIGINT -> NUMBER (compatible Numeric <-> Numeric)
        ttm.getColumnMappings().add(ColumnMapping.builder()
                .targetTableMapping(ttm).sourceColumn("id").targetColumn("ID").mappingOrder(0).build());

        // 2. VARCHAR -> TO_DATE -> TIMESTAMP(6) (built-in transform produces DATE_TIME)
        ColumnMapping dateMapping = ColumnMapping.builder()
                .targetTableMapping(ttm).sourceColumn("date_str").targetColumn("EVENT_DATE").mappingOrder(1).build();
        dateMapping.getTransformations().add(Transformation.builder()
                .columnMapping(dateMapping)
                .functionName(com.datashifter.common.enums.TransformFunction.TO_DATE)
                .arguments("'yyyy-MM-dd'")
                .executionOrder(0)
                .build());
        ttm.getColumnMappings().add(dateMapping);

        // 3. Postgres BOOLEAN -> Oracle NUMBER (compatible Boolean <-> Oracle Numeric)
        ttm.getColumnMappings().add(ColumnMapping.builder()
                .targetTableMapping(ttm).sourceColumn("is_active").targetColumn("ACTIVE_FLAG").mappingOrder(2).build());

        // 4. BIGINT -> UDF -> TIMESTAMP(6) (skipped at compile time because it uses a UDF)
        ColumnMapping udfMapping = ColumnMapping.builder()
                .targetTableMapping(ttm).sourceColumn("epoch_ms").targetColumn("UDF_TIMESTAMP").mappingOrder(3).build();
        udfMapping.getTransformations().add(Transformation.builder()
                .columnMapping(udfMapping)
                .functionName(com.datashifter.common.enums.TransformFunction.UDF)
                .arguments("{\"udfId\":\"123\"}")
                .executionOrder(0)
                .build());
        ttm.getColumnMappings().add(udfMapping);

        pt.getTargetTableMappings().add(ttm);
        pipeline.getPipelineTables().add(pt);

        List<String> errors = mappingService.validatePipeline(pipeline);

        assertTrue(errors.isEmpty(), "Expected no validation errors, got: " + errors);
    }

    @Test
    void testPostgresIntegerToOracleDateWithToDateTransformPasses() {
        String sourceConnId = "conn-source-pg";
        String targetConnId = "conn-target-ora";

        Connection sourceConn = Connection.builder()
                .dbType(DatabaseType.POSTGRESQL)
                .host("localhost").port(5432).databaseName("srcdb")
                .encryptedPassword(com.datashifter.common.utils.EncryptionUtil.encrypt("test"))
                .build();
        sourceConn.setId(sourceConnId);

        Connection targetConn = Connection.builder()
                .dbType(DatabaseType.ORACLE)
                .host("localhost").port(1521).databaseName("ORCL")
                .encryptedPassword(com.datashifter.common.utils.EncryptionUtil.encrypt("test"))
                .build();
        targetConn.setId(targetConnId);

        DatabaseConnector sourceConnector = mock(DatabaseConnector.class);
        DatabaseConnector targetConnector = mock(DatabaseConnector.class);

        when(connectionRepository.findById(sourceConnId)).thenReturn(Optional.of(sourceConn));
        when(connectionRepository.findById(targetConnId)).thenReturn(Optional.of(targetConn));
        when(connectorFactory.getConnector(DatabaseType.POSTGRESQL)).thenReturn(sourceConnector);
        when(connectorFactory.getConnector(DatabaseType.ORACLE)).thenReturn(targetConnector);

        List<ColumnMetadata> sourceCols = List.of(
                ColumnMetadata.builder().columnName("id").dataType("INTEGER").nullable(false).primaryKey(true).build(),
                ColumnMetadata.builder().columnName("created_epoch").dataType("INTEGER").nullable(false).primaryKey(false).build(),
                ColumnMetadata.builder().columnName("event_date").dataType("DATE").nullable(true).primaryKey(false).build()
        );
        List<ColumnMetadata> targetCols = List.of(
                ColumnMetadata.builder().columnName("ID").dataType("NUMBER").nullable(false).primaryKey(true).build(),
                ColumnMetadata.builder().columnName("CREATED_DATE").dataType("DATE").nullable(false).primaryKey(false).build(),
                ColumnMetadata.builder().columnName("EVENT_EPOCH").dataType("NUMBER").nullable(true).primaryKey(false).build()
        );

        when(sourceConnector.getColumns(any(ConnectionConfig.class), eq("orders"))).thenReturn(sourceCols);
        when(targetConnector.getColumns(any(ConnectionConfig.class), eq("ORDERS_ORA"))).thenReturn(targetCols);

        Pipeline pipeline = Pipeline.builder()
                .sourceConnectionId(sourceConnId)
                .targetConnectionId(targetConnId)
                .build();

        PipelineTable pt = PipelineTable.builder().pipeline(pipeline).sourceTable("orders").build();
        TargetTableMapping ttm = TargetTableMapping.builder()
                .pipelineTable(pt).targetTable("ORDERS_ORA").writeMode(WriteMode.UPSERT).build();

        // 1. INTEGER -> NUMBER
        ttm.getColumnMappings().add(ColumnMapping.builder()
                .targetTableMapping(ttm).sourceColumn("id").targetColumn("ID").mappingOrder(0).build());

        // 2. Postgres INTEGER -> TO_DATE (no format arg needed for epoch integer) -> Oracle DATE
        ColumnMapping intToDateMapping = ColumnMapping.builder()
                .targetTableMapping(ttm).sourceColumn("created_epoch").targetColumn("CREATED_DATE").mappingOrder(1).build();
        intToDateMapping.getTransformations().add(Transformation.builder()
                .columnMapping(intToDateMapping)
                .functionName(com.datashifter.common.enums.TransformFunction.TO_DATE)
                .arguments("")
                .executionOrder(0)
                .build());
        ttm.getColumnMappings().add(intToDateMapping);

        // 3. Postgres DATE -> TO_NUMBER -> Oracle NUMBER
        ColumnMapping dateToNumMapping = ColumnMapping.builder()
                .targetTableMapping(ttm).sourceColumn("event_date").targetColumn("EVENT_EPOCH").mappingOrder(2).build();
        dateToNumMapping.getTransformations().add(Transformation.builder()
                .columnMapping(dateToNumMapping)
                .functionName(com.datashifter.common.enums.TransformFunction.TO_NUMBER)
                .arguments("")
                .executionOrder(0)
                .build());
        ttm.getColumnMappings().add(dateToNumMapping);

        pt.getTargetTableMappings().add(ttm);
        pipeline.getPipelineTables().add(pt);

        List<String> errors = mappingService.validatePipeline(pipeline);

        assertTrue(errors.isEmpty(), "Expected Postgres INTEGER -> TO_DATE -> Oracle DATE and DATE -> TO_NUMBER -> NUMBER to pass, got: " + errors);
    }

    @Test
    void testUdfReferenceValidationStepDetectsMissingUdfClassAndMethodBeforeDataTypeStep() {
        String sourceConnId = "conn-source-pg";
        String targetConnId = "conn-target-ora";

        Connection sourceConn = Connection.builder()
                .dbType(DatabaseType.POSTGRESQL)
                .host("localhost").port(5432).databaseName("srcdb")
                .encryptedPassword(com.datashifter.common.utils.EncryptionUtil.encrypt("test"))
                .build();
        sourceConn.setId(sourceConnId);

        Connection targetConn = Connection.builder()
                .dbType(DatabaseType.ORACLE)
                .host("localhost").port(1521).databaseName("ORCL")
                .encryptedPassword(com.datashifter.common.utils.EncryptionUtil.encrypt("test"))
                .build();
        targetConn.setId(targetConnId);

        when(connectionRepository.findById(sourceConnId)).thenReturn(Optional.of(sourceConn));
        when(connectionRepository.findById(targetConnId)).thenReturn(Optional.of(targetConn));
        when(connectorFactory.getConnector(DatabaseType.ORACLE)).thenReturn(databaseConnector);

        List<ColumnMetadata> targetCols = List.of(
                ColumnMetadata.builder().columnName("ID").dataType("NUMBER").nullable(false).primaryKey(true).build(),
                ColumnMetadata.builder().columnName("EMAIL_ADDRESS").dataType("VARCHAR2").nullable(false).primaryKey(false).build()
        );
        when(databaseConnector.getColumns(any(ConnectionConfig.class), eq("CUSTOMER_MASTER"))).thenReturn(targetCols);

        com.datashifter.common.repositories.UdfDefinitionRepository udfRepo =
                org.mockito.Mockito.mock(com.datashifter.common.repositories.UdfDefinitionRepository.class);
        when(udfRepo.findFirstByNameOrderByUpdatedAtDesc("datashifter-valid-udf-0.1.4"))
                .thenReturn(Optional.empty());

        com.datashifter.pipeline.validation.PipelineValidationChain chain =
                new com.datashifter.pipeline.validation.PipelineValidationChain(List.of(
                        new com.datashifter.pipeline.validation.steps.ColumnMappingValidationStep(),
                        new com.datashifter.pipeline.validation.steps.UdfReferenceValidationStep(udfRepo),
                        new com.datashifter.pipeline.validation.steps.ColumnDataTypeValidationStep(
                                new com.datashifter.pipeline.validation.datatype.DatabaseTypeDialectFactory(),
                                new com.datashifter.pipeline.validation.datatype.TransformTypeResolver())));

        MappingService svcWithUdfValidation = new MappingService(
                pipelineRepository, connectorFactory, connectionRepository, new com.fasterxml.jackson.databind.ObjectMapper(), chain);

        Pipeline pipeline = Pipeline.builder()
                .sourceConnectionId(sourceConnId)
                .targetConnectionId(targetConnId)
                .build();

        PipelineTable pt = PipelineTable.builder().pipeline(pipeline).sourceTable("customers").build();
        TargetTableMapping ttm = TargetTableMapping.builder()
                .pipelineTable(pt).targetTable("CUSTOMER_MASTER").writeMode(WriteMode.UPSERT).build();

        ttm.getColumnMappings().add(ColumnMapping.builder()
                .targetTableMapping(ttm).sourceColumn("id").targetColumn("ID").mappingOrder(0).build());

        ColumnMapping emailMapping = ColumnMapping.builder()
                .targetTableMapping(ttm).sourceColumn("email").targetColumn("EMAIL_ADDRESS").mappingOrder(1).build();
        emailMapping.getTransformations().add(Transformation.builder()
                .columnMapping(emailMapping)
                .functionName(com.datashifter.common.enums.TransformFunction.UDF)
                .arguments("{\"udfName\":\"datashifter-valid-udf-0.1.4\",\"className\":\"com.datashifter.fixtures.CustomerFunctions\",\"methodName\":\"normalizeEmail\"}")
                .executionOrder(0)
                .build());
        ttm.getColumnMappings().add(emailMapping);

        pt.getTargetTableMappings().add(ttm);
        pipeline.getPipelineTables().add(pt);

        List<String> errors = svcWithUdfValidation.validatePipeline(pipeline);

        assertEquals(1, errors.size());
        assertTrue(errors.get(0).contains("UDF 'datashifter-valid-udf-0.1.4' does not exist"), "Got: " + errors.get(0));
    }
}

