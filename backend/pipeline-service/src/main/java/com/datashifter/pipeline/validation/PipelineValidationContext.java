package com.datashifter.pipeline.validation;

import com.datashifter.common.dtos.ConnectionDtos.ColumnMetadata;
import com.datashifter.common.models.Connection;
import com.datashifter.common.models.Pipeline;
import com.datashifter.connector.spi.interfaces.ConnectionConfig;
import com.datashifter.connector.spi.interfaces.DatabaseConnector;
import lombok.Builder;
import lombok.Getter;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Shared context passed through each {@link PipelineValidationStep} in the
 * validation chain, holding connectors, configurations, and cached column metadata
 * to avoid duplicate schema queries across steps.
 */
@Getter
@Builder
public class PipelineValidationContext {

    private final Pipeline pipeline;
    private final Connection sourceConnection;
    private final Connection targetConnection;
    private final DatabaseConnector sourceConnector;
    private final DatabaseConnector targetConnector;
    private final ConnectionConfig sourceConfig;
    private final ConnectionConfig targetConfig;

    @Builder.Default
    private final Map<String, List<ColumnMetadata>> sourceColumnCache = new HashMap<>();

    @Builder.Default
    private final Map<String, List<ColumnMetadata>> targetColumnCache = new HashMap<>();
}

