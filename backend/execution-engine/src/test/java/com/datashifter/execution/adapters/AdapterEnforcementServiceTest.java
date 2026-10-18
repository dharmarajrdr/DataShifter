package com.datashifter.execution.adapters;

import com.datashifter.common.enums.DatabaseType;
import com.datashifter.common.enums.PipelineMode;
import com.datashifter.common.exceptions.DatashifterException;
import com.datashifter.common.models.Connection;
import com.datashifter.common.models.Pipeline;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdapterEnforcementServiceTest {

    @Mock
    private AdapterExecutionManager executionManager;

    private AdapterEnforcementService enforcementService;

    @BeforeEach
    void setUp() {
        enforcementService = new AdapterEnforcementService(executionManager, new ObjectMapper());
    }

    @Test
    @DisplayName("Throws error when both source and target adapters are missing")
    void testBothAdaptersMissingThrowsError() {
        Pipeline pipeline = Pipeline.builder().pipelineMode(PipelineMode.BATCH).build();
        Connection src = Connection.builder().dbType(DatabaseType.POSTGRESQL).build();
        Connection tgt = Connection.builder().dbType(DatabaseType.ORACLE).build();

        when(executionManager.isAdapterInstalled("postgres-reader")).thenReturn(false);
        when(executionManager.isAdapterInstalled("oracle-writer")).thenReturn(false);

        assertThatThrownBy(() -> enforcementService.enforceAdapters(pipeline, src, tgt, null, null))
                .isInstanceOf(DatashifterException.class)
                .hasMessage("Adapter \"postgres-reader\" and \"oracle-writer\" is missing. Please install from Marketplace.");
    }

    @Test
    @DisplayName("Throws error when only source adapter is missing")
    void testSourceAdapterMissingThrowsError() {
        Pipeline pipeline = Pipeline.builder().pipelineMode(PipelineMode.BATCH).build();
        Connection src = Connection.builder().dbType(DatabaseType.POSTGRESQL).build();
        Connection tgt = Connection.builder().dbType(DatabaseType.ORACLE).build();

        when(executionManager.isAdapterInstalled("postgres-reader")).thenReturn(false);
        when(executionManager.isAdapterInstalled("oracle-writer")).thenReturn(true);

        assertThatThrownBy(() -> enforcementService.enforceAdapters(pipeline, src, tgt, null, null))
                .isInstanceOf(DatashifterException.class)
                .hasMessage("Adapter \"postgres-reader\" is missing. Please install from Marketplace.");
    }

    @Test
    @DisplayName("Succeeds when both adapters are installed")
    void testBothAdaptersInstalledSucceeds() {
        Pipeline pipeline = Pipeline.builder().pipelineMode(PipelineMode.BATCH).build();
        Connection src = Connection.builder().dbType(DatabaseType.POSTGRESQL).build();
        Connection tgt = Connection.builder().dbType(DatabaseType.ORACLE).build();

        when(executionManager.isAdapterInstalled("postgres-reader")).thenReturn(true);
        when(executionManager.isAdapterInstalled("oracle-writer")).thenReturn(true);

        enforcementService.enforceAdapters(pipeline, src, tgt, null, null);
        assertThat(pipeline.getSourceAdapterId()).isEqualTo("postgres-reader");
        assertThat(pipeline.getTargetAdapterId()).isEqualTo("oracle-writer");
    }
}

