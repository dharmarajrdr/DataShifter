package com.datashifter.pipeline.services;

import com.datashifter.common.dtos.ConnectionDtos.ColumnMetadata;
import com.datashifter.common.enums.DatabaseType;
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
}
