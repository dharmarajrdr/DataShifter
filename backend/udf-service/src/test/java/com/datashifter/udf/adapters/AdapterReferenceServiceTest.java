package com.datashifter.udf.adapters;

import com.datashifter.udf.adapters.services.AdapterReferenceService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Unit tests for AdapterReferenceService (<= 100 lines).
 */
@ExtendWith(MockitoExtension.class)
class AdapterReferenceServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @InjectMocks
    private AdapterReferenceService service;

    @Test
    void testGetPipelineReferencesAndCount() throws SQLException {
        ResultSet rs1 = mock(ResultSet.class);
        when(rs1.getString("id")).thenReturn("pipe-1");
        when(rs1.getString("source_adapter_id")).thenReturn("postgres-reader");
        when(rs1.getString("target_adapter_id")).thenReturn("oracle-writer");

        ResultSet rs2 = mock(ResultSet.class);
        when(rs2.getString("id")).thenReturn("pipe-2");
        when(rs2.getString("source_adapter_id")).thenReturn("postgres-reader");
        when(rs2.getString("target_adapter_id")).thenReturn("oracle-writer");

        doAnswer(inv -> {
            RowCallbackHandler rch = inv.getArgument(1);
            rch.processRow(rs1);
            rch.processRow(rs2);
            return null;
        }).when(jdbcTemplate).query(anyString(), any(RowCallbackHandler.class));

        Map<String, Set<String>> refs = service.getPipelineReferences();
        assertEquals(2, refs.get("postgres-reader").size());
        assertEquals(2, refs.get("oracle-writer").size());

        int count = service.countPipelines("ad-uuid-1", "postgres-reader", refs);
        assertEquals(2, count);

        int zeroCount = service.countPipelines("ad-unknown", "unknown-key", refs);
        assertEquals(0, zeroCount);
    }

    @Test
    void testCountPipelinesHandlesNullOrEmpty() {
        assertEquals(0, service.countPipelines(null, null, null));
        assertEquals(0, service.countPipelines("ad-1", "key-1", Map.of()));
    }
}
