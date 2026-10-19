package com.datashifter.pipeline.services;

import com.datashifter.common.dtos.MappingDtos.MappingResponse;
import com.datashifter.common.dtos.MappingDtos.TablePairMapping;
import com.datashifter.common.enums.PipelineMode;
import com.datashifter.common.enums.PipelineStatus;
import com.datashifter.common.models.Pipeline;
import com.datashifter.common.models.PipelineTable;
import com.datashifter.connector.factories.ConnectorFactory;
import com.datashifter.connector.repositories.ConnectionRepository;
import com.datashifter.pipeline.repositories.PipelineRepository;
import com.datashifter.pipeline.services.implementations.MappingService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MappingServiceCdcDdlTest {

    @Mock private PipelineRepository pipelineRepository;
    @Mock private ConnectorFactory connectorFactory;
    @Mock private ConnectionRepository connectionRepository;

    private MappingService mappingService;

    private static final String CUSTOMERS_DDL = """
            CREATE TABLE public.customers (
                customer_id BIGINT NOT NULL,
                customer_code VARCHAR(20) NOT NULL,
                signup_ts TIMESTAMP WITH TIME ZONE NOT NULL,
                credit_limit NUMERIC(12,2),
                CONSTRAINT customers_pkey PRIMARY KEY (customer_id)
            );
            """;

    @BeforeEach
    void setUp() {
        mappingService = new MappingService(pipelineRepository, connectorFactory, connectionRepository, new ObjectMapper());
    }

    @Test
    void shouldExtractColumnsFromDdlWhenSourceConnectionIsNull() {
        PipelineTable pt = PipelineTable.builder()
                .sourceTable("public.customers")
                .sourceSchemaSql(CUSTOMERS_DDL)
                .executionOrder(0)
                .build();
        pt.setId("pt-1");

        Pipeline pipeline = Pipeline.builder()
                .name("CDC WAL to Oracle")
                .pipelineMode(PipelineMode.CDC)
                .status(PipelineStatus.NOT_VALIDATED)
                .sourceConnectionId(null)
                .targetConnectionId(null)
                .pipelineTables(new LinkedHashSet<>(List.of(pt)))
                .build();

        when(pipelineRepository.findById("p-cdc-1")).thenReturn(Optional.of(pipeline));

        MappingResponse res = mappingService.getMappings("p-cdc-1");
        assertThat(res).isNotNull();
        assertThat(res.getTablePairs()).hasSize(1);

        TablePairMapping pair = res.getTablePairs().get(0);
        assertThat(pair.getSourceTable()).isEqualTo("public.customers");
        assertThat(pair.getSourceColumns()).hasSize(4);

        assertThat(pair.getSourceColumns().get(0).getName()).isEqualTo("customer_id");
        assertThat(pair.getSourceColumns().get(0).isPrimaryKey()).isTrue();
        assertThat(pair.getSourceColumns().get(0).isNullable()).isFalse();

        assertThat(pair.getSourceColumns().get(2).getName()).isEqualTo("signup_ts");
        assertThat(pair.getSourceColumns().get(2).getDataType()).isEqualTo("TIMESTAMP WITH TIME ZONE");
    }
}
