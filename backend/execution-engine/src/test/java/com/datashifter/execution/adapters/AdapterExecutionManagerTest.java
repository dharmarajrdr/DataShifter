package com.datashifter.execution.adapters;

import com.datashifter.adapter.sdk.AdapterConfig;
import com.datashifter.adapter.sdk.DataRecord;
import com.datashifter.adapter.sdk.DataReader;
import com.datashifter.adapter.sdk.DataWriter;
import com.datashifter.adapter.sdk.WriteMode;
import com.datashifter.adapter.sdk.WriteResult;
import com.datashifter.common.exceptions.DatashifterException;
import com.datashifter.common.models.AdapterDefinition;
import com.datashifter.common.repositories.AdapterDefinitionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.nio.file.Path;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdapterExecutionManagerTest {

    @Mock
    private AdapterDefinitionRepository definitionRepo;

    private ObjectMapper objectMapper;
    private AdapterExecutionManager manager;

    @BeforeEach
    void setUp(@TempDir Path tempDir) {
        objectMapper = new ObjectMapper();
        manager = new AdapterExecutionManager(tempDir.toString(), definitionRepo, objectMapper);
    }

    public static class DummyTestWriter implements DataWriter {
        @Override
        public WriteResult writeBatch(AdapterConfig config, String targetTable, List<DataRecord> records, WriteMode writeMode, String primaryKeyColumn) {
            return WriteResult.success(records != null ? records.size() : 0);
        }
    }

    public static class DummyTestReader implements DataReader {
        @Override
        public List<DataRecord> readChunk(AdapterConfig config, String tableName, String primaryKeyColumn, String lastPkValue, int chunkSize) {
            return Collections.emptyList();
        }
    }

    @Test
    @DisplayName("Load writer via database AdapterDefinition")
    void testLoadWriterViaDefinition() {
        AdapterDefinition def = AdapterDefinition.builder()
                .adapterKey("test-writer")
                .className(DummyTestWriter.class.getName())
                .build();
        when(definitionRepo.findByAdapterKey("test-writer")).thenReturn(Optional.of(def));

        DataWriter writer = manager.getWriter("test-writer", new AdapterConfig());
        assertThat(writer).isNotNull();
        assertThat(writer).isInstanceOf(DummyTestWriter.class);
    }

    @Test
    @DisplayName("Load reader via database AdapterDefinition")
    void testLoadReaderViaDefinition() {
        AdapterDefinition def = AdapterDefinition.builder()
                .adapterKey("test-reader")
                .className(DummyTestReader.class.getName())
                .build();
        when(definitionRepo.findByAdapterKey("test-reader")).thenReturn(Optional.of(def));

        DataReader reader = manager.getReader("test-reader", new AdapterConfig());
        assertThat(reader).isNotNull();
        assertThat(reader).isInstanceOf(DummyTestReader.class);
    }

    @Test
    @DisplayName("Load adapter directly by class name")
    void testLoadAdapterByClassName() {
        when(definitionRepo.findByAdapterKey(DummyTestWriter.class.getName())).thenReturn(Optional.empty());
        when(definitionRepo.findById(DummyTestWriter.class.getName())).thenReturn(Optional.empty());

        DataWriter writer = manager.getWriter(DummyTestWriter.class.getName(), new AdapterConfig());
        assertThat(writer).isNotNull();
        assertThat(writer).isInstanceOf(DummyTestWriter.class);
    }

    @Test
    @DisplayName("Parse valid, empty, and invalid config JSON")
    void testParseConfig() {
        String json = "{\"batchSize\": 500, \"directory\": \"/tmp/data\"}";
        AdapterConfig config = manager.parseConfig(json);

        assertThat(config.getInteger("batchSize", 0)).isEqualTo(500);
        assertThat(config.getString("directory", "")).isEqualTo("/tmp/data");

        AdapterConfig emptyConfig = manager.parseConfig("");
        assertThat(emptyConfig.getProperties()).isEmpty();

        AdapterConfig nullConfig = manager.parseConfig(null);
        assertThat(nullConfig.getProperties()).isEmpty();

        AdapterConfig invalidConfig = manager.parseConfig("not-json");
        assertThat(invalidConfig.getProperties()).isEmpty();
    }

    @Test
    @DisplayName("Unknown adapter throws DatashifterException")
    void testUnknownAdapterThrowsException() {
        when(definitionRepo.findByAdapterKey("non-existent")).thenReturn(Optional.empty());
        when(definitionRepo.findById("non-existent")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> manager.getWriter("non-existent", new AdapterConfig()))
                .isInstanceOf(DatashifterException.class)
                .hasMessageContaining("could not be loaded");
    }

    @Test
    @DisplayName("Safe close handles null and active adapters")
    void testSafeClose() {
        manager.close(null);

        DummyTestWriter writer = new DummyTestWriter();
        manager.close(writer);
    }
}
