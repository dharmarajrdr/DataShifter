package com.datashifter.execution.strategies.transformers;

import com.datashifter.common.enums.UdfFailurePolicy;
import com.datashifter.execution.contexts.ExecutionContext.ResolvedColumnMapping;
import com.datashifter.execution.exceptions.UdfFailChunkException;
import com.datashifter.execution.exceptions.UdfStopPipelineException;
import com.datashifter.execution.services.implementations.ColumnMapperService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UdfExecutionPolicyTest {

    @Mock
    private UdfExecutionManager udfExecutionManager;

    @InjectMocks
    private ColumnMapperService columnMapperService;

    @Test
    void testSkipRowPolicyDropsRowFromBatch() {
        ColumnTransformer mockUdfTransformer = new ColumnTransformer() {
            @Override
            public Object transform(Object input, String arguments) {
                return input;
            }

            @Override
            public Object transform(Object input, String arguments, Map<String, Object> sourceRow, String targetColumn) {
                if ("bad_user".equals(sourceRow.get("username"))) {
                    throw new com.datashifter.execution.exceptions.UdfSkipRowException("Row skipped by policy");
                }
                return "good_user_transformed";
            }

            @Override
            public String getFunctionName() {
                return "UDF";
            }
        };

        TransformerChain chain = new TransformerChain(List.of(
                new TransformerChain.TransformerStep(mockUdfTransformer, "{}")
        ));

        ResolvedColumnMapping mapping = ResolvedColumnMapping.builder()
                .sourceColumn("username")
                .targetColumn("username")
                .chain(chain)
                .mapped(true)
                .build();

        List<Map<String, Object>> batch = List.of(
                Map.of("username", "good_user"),
                Map.of("username", "bad_user"),
                Map.of("username", "another_good_user")
        );

        ColumnMapperService.BatchMappingResult result = columnMapperService.mapBatch(batch, List.of(mapping));

        // 1 row skipped -> only 2 records in targetRecords
        assertEquals(2, result.getTargetRecords().size());
        assertEquals(1, result.getFailedRecords().size());
        assertEquals("bad_user", result.getFailedRecords().get(0).getSourceRecord().get("username"));
    }

    @Test
    void testFailChunkPolicyThrowsException() {
        ColumnTransformer mockUdfTransformer = new ColumnTransformer() {
            @Override
            public Object transform(Object input, String arguments) {
                return input;
            }

            @Override
            public Object transform(Object input, String arguments, Map<String, Object> sourceRow, String targetColumn) {
                throw new UdfFailChunkException("Chunk aborted due to policy");
            }

            @Override
            public String getFunctionName() {
                return "UDF";
            }
        };

        TransformerChain chain = new TransformerChain(List.of(
                new TransformerChain.TransformerStep(mockUdfTransformer, "{}")
        ));

        ResolvedColumnMapping mapping = ResolvedColumnMapping.builder()
                .sourceColumn("id")
                .targetColumn("id")
                .chain(chain)
                .mapped(true)
                .build();

        assertThrows(UdfFailChunkException.class, () ->
                columnMapperService.mapBatch(List.of(Map.of("id", 1)), List.of(mapping))
        );
    }

    @Test
    void testStopPipelinePolicyThrowsException() {
        ColumnTransformer mockUdfTransformer = new ColumnTransformer() {
            @Override
            public Object transform(Object input, String arguments) {
                return input;
            }

            @Override
            public Object transform(Object input, String arguments, Map<String, Object> sourceRow, String targetColumn) {
                throw new UdfStopPipelineException("Pipeline halted due to policy");
            }

            @Override
            public String getFunctionName() {
                return "UDF";
            }
        };

        TransformerChain chain = new TransformerChain(List.of(
                new TransformerChain.TransformerStep(mockUdfTransformer, "{}")
        ));

        ResolvedColumnMapping mapping = ResolvedColumnMapping.builder()
                .sourceColumn("id")
                .targetColumn("id")
                .chain(chain)
                .mapped(true)
                .build();

        assertThrows(UdfStopPipelineException.class, () ->
                columnMapperService.mapBatch(List.of(Map.of("id", 1)), List.of(mapping))
        );
    }

    @Test
    void testMissingUdfByNameThrowsClearError() {
        com.datashifter.common.repositories.UdfDefinitionRepository repo = org.mockito.Mockito.mock(
                com.datashifter.common.repositories.UdfDefinitionRepository.class);
        org.springframework.kafka.core.KafkaTemplate<String, Object> kafka = org.mockito.Mockito.mock(
                org.springframework.kafka.core.KafkaTemplate.class);
        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();

        UdfExecutionManager manager = new UdfExecutionManager("/tmp", 5000L, repo, kafka, mapper);
        when(repo.findFirstByNameOrderByUpdatedAtDesc("datashifter-valid-udf-0.1.4"))
                .thenReturn(java.util.Optional.empty());

        UdfStopPipelineException ex = assertThrows(UdfStopPipelineException.class, () ->
                manager.prepare("{\"udfName\":\"datashifter-valid-udf-0.1.4\",\"className\":\"com.datashifter.fixtures.CustomerFunctions\",\"methodName\":\"normalizeEmail\"}")
        );
        assertTrue(ex.getMessage().contains("UDF 'datashifter-valid-udf-0.1.4' does not exist"));
        manager.shutdown();
    }

    @Test
    void testMissingClassOrMethodInUdfThrowsClearError() {
        com.datashifter.common.repositories.UdfDefinitionRepository repo = org.mockito.Mockito.mock(
                com.datashifter.common.repositories.UdfDefinitionRepository.class);
        org.springframework.kafka.core.KafkaTemplate<String, Object> kafka = org.mockito.Mockito.mock(
                org.springframework.kafka.core.KafkaTemplate.class);
        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();

        com.datashifter.common.models.UdfDefinition def = com.datashifter.common.models.UdfDefinition.builder()
                .name("datashifter-valid-udf-0.1.4")
                .storageKey("org/test.jar")
                .build();
        def.getFunctions().add(com.datashifter.common.models.UdfFunction.builder()
                .udfDefinition(def)
                .className("com.datashifter.fixtures.CustomerFunctions")
                .methodName("normalizeEmail")
                .functionName("normalizeEmail")
                .parameterTypes("com.datashifter.udf.sdk.Row")
                .returnType("java.lang.String")
                .build());

        UdfExecutionManager manager = new UdfExecutionManager("/tmp", 5000L, repo, kafka, mapper);
        when(repo.findFirstByNameOrderByUpdatedAtDesc("datashifter-valid-udf-0.1.4"))
                .thenReturn(java.util.Optional.of(def));

        UdfStopPipelineException missingClassEx = assertThrows(UdfStopPipelineException.class, () ->
                manager.prepare("{\"udfName\":\"datashifter-valid-udf-0.1.4\",\"className\":\"com.datashifter.fixtures.WrongClass\",\"methodName\":\"normalizeEmail\"}")
        );
        assertTrue(missingClassEx.getMessage().contains("Class 'com.datashifter.fixtures.WrongClass' does not exist in UDF 'datashifter-valid-udf-0.1.4'"));

        UdfStopPipelineException missingMethodEx = assertThrows(UdfStopPipelineException.class, () ->
                manager.prepare("{\"udfName\":\"datashifter-valid-udf-0.1.4\",\"className\":\"com.datashifter.fixtures.CustomerFunctions\",\"methodName\":\"wrongMethod\"}")
        );
        assertTrue(missingMethodEx.getMessage().contains("Method 'wrongMethod' does not exist in class 'com.datashifter.fixtures.CustomerFunctions' of UDF 'datashifter-valid-udf-0.1.4'"));
        manager.shutdown();
    }
}
