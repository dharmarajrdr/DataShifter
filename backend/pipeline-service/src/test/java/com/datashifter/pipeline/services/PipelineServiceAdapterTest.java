package com.datashifter.pipeline.services;

import com.datashifter.common.dtos.PipelineDtos.*;
import com.datashifter.common.enums.*;
import com.datashifter.common.models.*;
import com.datashifter.common.repositories.CommonWorkflowNodeRepository;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PipelineServiceAdapterTest {

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
    @Mock
    private CommonWorkflowNodeRepository workflowNodeRepository;
    @Mock
    private com.datashifter.pipeline.services.interfaces.WorkflowService workflowService;

    @InjectMocks
    private PipelineServiceImpl pipelineService;

    private final String orgId = "org-test-1";
    private final String userId = "user-test-1";

    @BeforeEach
    void setUp() {
        UserContext.set(UserContext.Context.builder()
                .orgId(orgId)
                .userId(userId)
                .permissions(Set.of("PIPELINE_CREATE", "PIPELINE_VIEW", "PIPELINE_EDIT"))
                .build());
    }

    @AfterEach
    void tearDown() {
        UserContext.clear();
    }

    @Test
    @DisplayName("Create pipeline persists adapter IDs and configurations")
    void testCreatePipelineWithAdapters() {
        AppUser mockUser = AppUser.builder().build();
        mockUser.setId(userId);
        when(entityManager.getReference(AppUser.class, userId)).thenReturn(mockUser);
        when(repository.findByOrgId(orgId)).thenReturn(Collections.emptyList());

        when(repository.save(any(Pipeline.class))).thenAnswer(inv -> {
            Pipeline p = inv.getArgument(0);
            p.setId("pipe-adapter-1");
            return p;
        });
        when(workflowNodeRepository.findByPipelineIdWithWorkflow(anyString())).thenReturn(Optional.empty());

        CreatePipelineRequest request = CreatePipelineRequest.builder()
                .name("Postgres-to-Kafka-Stream")
                .sourceAdapterId("postgres-wal-reader")
                .targetAdapterId("kafka-writer")
                .sourceConfig("{\"slotName\":\"ds_slot\"}")
                .targetConfig("{\"bootstrapServers\":\"localhost:9092\"}")
                .pipelineMode(PipelineMode.CDC)
                .chunkSize(5000)
                .build();

        PipelineResponse response = pipelineService.create(request);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo("pipe-adapter-1");
        assertThat(response.getSourceAdapterId()).isEqualTo("postgres-wal-reader");
        assertThat(response.getTargetAdapterId()).isEqualTo("kafka-writer");
        assertThat(response.getSourceConfig()).isEqualTo("{\"slotName\":\"ds_slot\"}");
        assertThat(response.getTargetConfig()).isEqualTo("{\"bootstrapServers\":\"localhost:9092\"}");
    }

    @Test
    @DisplayName("Update pipeline updates adapter settings")
    void testUpdatePipelineWithAdapters() {
        Pipeline existing = Pipeline.builder()
                .name("Legacy-Pipeline")
                .status(PipelineStatus.PAUSED)
                .sourceAdapterId("oracle-reader")
                .targetAdapterId("postgres-writer")
                .build();
        existing.setId("pipe-1");

        when(repository.findById("pipe-1")).thenReturn(Optional.of(existing));
        when(repository.save(any(Pipeline.class))).thenAnswer(inv -> inv.getArgument(0));
        when(workflowNodeRepository.findByPipelineIdWithWorkflow("pipe-1")).thenReturn(Optional.empty());

        UpdatePipelineRequest updateReq = UpdatePipelineRequest.builder()
                .sourceAdapterId("oracle-gg-reader")
                .targetAdapterId("filesystem-writer")
                .sourceConfig("{\"trailDir\":\"/dirdat\"}")
                .targetConfig("{\"directory\":\"/data/output\"}")
                .build();

        PipelineResponse updated = pipelineService.update("pipe-1", updateReq);

        assertThat(updated.getSourceAdapterId()).isEqualTo("oracle-gg-reader");
        assertThat(updated.getTargetAdapterId()).isEqualTo("filesystem-writer");
        assertThat(updated.getSourceConfig()).isEqualTo("{\"trailDir\":\"/dirdat\"}");
        assertThat(updated.getTargetConfig()).isEqualTo("{\"directory\":\"/data/output\"}");
    }

    @Test
    @DisplayName("Export pipeline includes adapter fields in PipelineConfigDto")
    void testExportPipelineWithAdapters() {
        Pipeline pipeline = Pipeline.builder()
                .name("Adapter-Export-Test")
                .status(PipelineStatus.VALIDATED)
                .sourceAdapterId("oracle-reader")
                .targetAdapterId("postgres-writer")
                .sourceConfig("{\"fetchSize\":1000}")
                .targetConfig("{\"batchSize\":2000}")
                .pipelineTables(new HashSet<>())
                .build();
        pipeline.setId("pipe-adapter-export");

        when(repository.findById("pipe-adapter-export")).thenReturn(Optional.of(pipeline));

        PipelineExportDto exportDto = pipelineService.exportPipeline("pipe-adapter-export");

        assertThat(exportDto).isNotNull();
        assertThat(exportDto.getPipeline().getSourceAdapterId()).isEqualTo("oracle-reader");
        assertThat(exportDto.getPipeline().getTargetAdapterId()).isEqualTo("postgres-writer");
        assertThat(exportDto.getPipeline().getSourceConfig()).isEqualTo("{\"fetchSize\":1000}");
        assertThat(exportDto.getPipeline().getTargetConfig()).isEqualTo("{\"batchSize\":2000}");
    }
}
