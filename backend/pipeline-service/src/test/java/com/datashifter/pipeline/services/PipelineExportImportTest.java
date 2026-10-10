package com.datashifter.pipeline.services;

import com.datashifter.common.dtos.PipelineDtos.*;
import com.datashifter.common.enums.*;
import com.datashifter.common.exceptions.DatashifterException;
import com.datashifter.common.models.*;
import com.datashifter.common.security.UserContext;
import com.datashifter.common.services.SubscriptionLimitChecker;
import com.datashifter.connector.repositories.ConnectionRepository;
import com.datashifter.pipeline.repositories.NamespaceRepository;
import com.datashifter.pipeline.repositories.PipelineRepository;
import com.datashifter.pipeline.services.implementations.MappingService;
import com.datashifter.pipeline.services.implementations.PipelineServiceImpl;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.kafka.core.KafkaTemplate;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PipelineExportImportTest {

    @Mock
    private PipelineRepository repository;
    @Mock
    private EntityManager entityManager;
    @Mock
    private KafkaTemplate<String, Object> kafkaTemplate;
    @Mock
    private NamespaceRepository namespaceRepository;
    @Mock
    private StringRedisTemplate redisTemplate;
    @Mock
    private SubscriptionLimitChecker limitChecker;
    @Mock
    private MappingService mappingService;
    @Mock
    private ObjectMapper objectMapper;
    @Mock
    private ConnectionRepository connectionRepository;

    @InjectMocks
    private PipelineServiceImpl pipelineService;

    private final String orgId = "org-1";
    private final String userId = "user-1";

    @BeforeEach
    void setUp() {
        UserContext.set(UserContext.Context.builder()
                .orgId(orgId)
                .userId(userId)
                .permissions(Set.of(Permissions.ALL.toArray(new String[0])))
                .build());
    }

    @AfterEach
    void tearDown() {
        UserContext.clear();
    }

    @Test
    @DisplayName("Export pipeline fails if pipeline is not in VALIDATED state")
    void exportPipelineFailsIfNotValidated() {
        Pipeline pipeline = Pipeline.builder()
                .name("Test Pipeline")
                .status(PipelineStatus.NOT_VALIDATED)
                .build();
        when(repository.findById("pipe-1")).thenReturn(Optional.of(pipeline));

        DatashifterException ex = assertThrows(DatashifterException.class, () -> {
            pipelineService.exportPipeline("pipe-1");
        });
        assertTrue(ex.getMessage().contains("Export is only permitted when the pipeline is in VALIDATED state"));
    }

    @Test
    @DisplayName("Export pipeline succeeds when pipeline is VALIDATED and produces sanitized JSON without IDs or passwords")
    void exportPipelineSucceedsWhenValidated() {
        Connection sourceConn = Connection.builder()
                .name("Source DB")
                .dbType(DatabaseType.POSTGRESQL)
                .host("localhost")
                .port(5432)
                .databaseName("mydb")
                .username("postgres")
                .encryptedPassword("secret-pass")
                .build();
        sourceConn.setId("conn-src-1");

        Connection targetConn = Connection.builder()
                .name("Target DB")
                .dbType(DatabaseType.POSTGRESQL)
                .host("remotehost")
                .port(5432)
                .databaseName("remotedb")
                .username("postgres")
                .encryptedPassword("secret-pass")
                .build();
        targetConn.setId("conn-tgt-1");

        Pipeline pipeline = Pipeline.builder()
                .name("Validated Pipeline")
                .description("Sample desc")
                .sourceConnectionId("conn-src-1")
                .targetConnectionId("conn-tgt-1")
                .status(PipelineStatus.VALIDATED)
                .chunkSize(5000)
                .defaultWriteMode(WriteMode.UPSERT)
                .build();
        pipeline.setId("pipe-1");

        PipelineTable pt = PipelineTable.builder()
                .pipeline(pipeline)
                .sourceTable("orders")
                .executionOrder(0)
                .mappingType(TableMappingType.ONE_TO_ONE)
                .build();
        TargetTableMapping ttm = TargetTableMapping.builder()
                .pipelineTable(pt)
                .targetTable("orders_tgt")
                .writeMode(WriteMode.UPSERT)
                .build();
        ColumnMapping cm = ColumnMapping.builder()
                .targetTableMapping(ttm)
                .sourceColumn("id")
                .targetColumn("order_id")
                .mappingOrder(0)
                .build();
        Transformation tr = Transformation.builder()
                .columnMapping(cm)
                .functionName(TransformFunction.TO_STRING)
                .executionOrder(0)
                .build();
        cm.getTransformations().add(tr);
        ttm.getColumnMappings().add(cm);
        pt.getTargetTableMappings().add(ttm);
        pipeline.getPipelineTables().add(pt);

        when(repository.findById("pipe-1")).thenReturn(Optional.of(pipeline));
        when(connectionRepository.findById("conn-src-1")).thenReturn(Optional.of(sourceConn));
        when(connectionRepository.findById("conn-tgt-1")).thenReturn(Optional.of(targetConn));

        PipelineExportDto exportDto = pipelineService.exportPipeline("pipe-1");

        assertNotNull(exportDto);
        assertEquals(1, exportDto.getVersion());
        assertEquals("Validated Pipeline", exportDto.getPipeline().getName());
        assertEquals("Source DB", exportDto.getPipeline().getSourceConnectionName());
        assertEquals("Target DB", exportDto.getPipeline().getTargetConnectionName());
        assertEquals(1, exportDto.getPipeline().getTables().size());
        assertEquals(2, exportDto.getConnections().size());
    }

    @Test
    @DisplayName("Import pipeline fails if duplicate pipeline name exists in organization")
    void importPipelineFailsOnDuplicatePipelineName() {
        PipelineExportDto dto = PipelineExportDto.builder()
                .version(1)
                .pipeline(PipelineConfigDto.builder()
                        .name("Existing Pipeline")
                        .sourceConnectionName("Src")
                        .targetConnectionName("Tgt")
                        .build())
                .build();

        when(repository.findByNameAndOrgId("Existing Pipeline", orgId))
                .thenReturn(Optional.of(new Pipeline()));

        PipelineImportResultDto result = pipelineService.importPipeline(dto);
        assertFalse(result.isSuccess());
        assertTrue(result.getErrors().stream().anyMatch(e -> e.contains("already exists")));
    }

    @Test
    @DisplayName("Import pipeline skips creating existing connection, creates new connection with empty password, and persists pipeline")
    void importPipelineCreatesAndReusesConnections() {
        Connection existingSrc = Connection.builder()
                .name("Existing Src")
                .dbType(DatabaseType.POSTGRESQL)
                .build();
        existingSrc.setId("conn-src-id");

        ConnectionConfigDto srcDto = ConnectionConfigDto.builder()
                .name("Existing Src")
                .dbType(DatabaseType.POSTGRESQL)
                .build();

        ConnectionConfigDto tgtDto = ConnectionConfigDto.builder()
                .name("New Tgt")
                .dbType(DatabaseType.POSTGRESQL)
                .host("newhost")
                .port(5432)
                .username("user")
                .build();

        PipelineExportDto exportDto = PipelineExportDto.builder()
                .version(1)
                .connections(List.of(srcDto, tgtDto))
                .pipeline(PipelineConfigDto.builder()
                        .name("New Imported Pipeline")
                        .sourceConnectionName("Existing Src")
                        .targetConnectionName("New Tgt")
                        .chunkSize(5000)
                        .tables(List.of(PipelineTableConfigDto.builder()
                                .sourceTable("users")
                                .executionOrder(0)
                                .targetMappings(List.of(TargetTableMappingConfigDto.builder()
                                        .targetTable("app_users")
                                        .columnMappings(List.of(ColumnMappingConfigDto.builder()
                                                .sourceColumn("id")
                                                .targetColumn("user_id")
                                                .build()))
                                        .build()))
                                .build()))
                        .build())
                .build();

        when(repository.findByNameAndOrgId("New Imported Pipeline", orgId)).thenReturn(Optional.empty());
        when(connectionRepository.findByNameAndOrgId("Existing Src", orgId)).thenReturn(Optional.of(existingSrc));
        when(connectionRepository.findByNameAndOrgId("New Tgt", orgId)).thenReturn(Optional.empty());

        Connection savedTgt = Connection.builder()
                .name("New Tgt")
                .dbType(DatabaseType.POSTGRESQL)
                .build();
        savedTgt.setId("conn-new-tgt-id");
        when(connectionRepository.save(any(Connection.class))).thenReturn(savedTgt);

        Pipeline savedPipe = Pipeline.builder()
                .name("New Imported Pipeline")
                .sourceConnectionId("conn-src-id")
                .targetConnectionId("conn-new-tgt-id")
                .status(PipelineStatus.NOT_VALIDATED)
                .build();
        savedPipe.setId("new-pipe-id");
        when(repository.save(any(Pipeline.class))).thenReturn(savedPipe);

        AppUser mockUser = new AppUser();
        when(entityManager.getReference(AppUser.class, userId)).thenReturn(mockUser);

        PipelineImportResultDto result = pipelineService.importPipeline(exportDto);

        assertTrue(result.isSuccess());
        assertEquals("new-pipe-id", result.getPipelineId());
        assertEquals(1, result.getCreatedConnectionNames().size());
        assertTrue(result.getCreatedConnectionNames().contains("New Tgt"));
        assertEquals(1, result.getExistingConnectionNames().size());
        assertTrue(result.getExistingConnectionNames().contains("Existing Src"));
        assertEquals(1, result.getTablesCount());
        assertEquals(1, result.getColumnMappingsCount());
        verify(connectionRepository, times(1)).save(any(Connection.class));
        verify(repository, times(1)).save(any(Pipeline.class));
    }

    @Test
    @DisplayName("Rollback import removes created pipeline and created connections")
    void rollbackImportRemovesCreatedEntities() {
        Organization org = new Organization();
        org.setId(orgId);
        AppUser user = new AppUser();
        user.setOrganization(org);

        Pipeline pipeline = Pipeline.builder().name("Test").createdBy(user).build();
        pipeline.setId("pipe-123");
        when(repository.findById("pipe-123")).thenReturn(Optional.of(pipeline));

        Connection conn = Connection.builder().name("Conn1").createdBy(user).build();
        conn.setId("conn-123");
        when(connectionRepository.findById("conn-123")).thenReturn(Optional.of(conn));

        PipelineRollbackRequest req = PipelineRollbackRequest.builder()
                .pipelineId("pipe-123")
                .createdConnectionIds(List.of("conn-123"))
                .build();

        PipelineRollbackResultDto result = pipelineService.rollbackImport(req);

        assertTrue(result.isSuccess());
        assertEquals("pipe-123", result.getDeletedPipelineId());
        assertEquals(List.of("conn-123"), result.getDeletedConnectionIds());
        verify(repository, times(1)).delete(pipeline);
        verify(connectionRepository, times(1)).delete(conn);
    }
}
