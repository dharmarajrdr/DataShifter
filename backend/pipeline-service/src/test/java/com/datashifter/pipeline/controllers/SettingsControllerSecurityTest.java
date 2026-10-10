package com.datashifter.pipeline.controllers;

import com.datashifter.common.dtos.PipelineDtos.*;
import com.datashifter.common.enums.Permissions;
import com.datashifter.common.security.PermissionInterceptor;
import com.datashifter.common.security.UserContext;
import com.datashifter.pipeline.services.interfaces.PipelineService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Set;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class SettingsControllerSecurityTest {

    private MockMvc mockMvc;

    @Mock
    private PipelineService pipelineService;

    @InjectMocks
    private SettingsController settingsController;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final String pipelineId = "pipe-123";
    private final String tableMappingId = "tbl-map-456";

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(settingsController)
                .addInterceptors(new PermissionInterceptor())
                .build();
    }

    @AfterEach
    void tearDown() {
        UserContext.clear();
    }

    @Nested
    @DisplayName("User with settings:edit permission")
    class AuthorizedUserTests {
        private final Set<String> perms = Set.of(Permissions.SETTINGS_EDIT);

        @Test
        @DisplayName("Can get pipeline settings")
        void canGetSettings() throws Exception {
            when(pipelineService.getById(pipelineId)).thenReturn(PipelineResponse.builder().id(pipelineId).build());

            mockMvc.perform(get("/api/v1/pipelines/{pipelineId}/settings", pipelineId)
                            .requestAttr("permissions", perms))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Can update pipeline settings")
        void canUpdateSettings() throws Exception {
            UpdatePipelineRequest req = new UpdatePipelineRequest();
            req.setName("Updated Pipeline");

            when(pipelineService.update(eq(pipelineId), any())).thenReturn(PipelineResponse.builder().id(pipelineId).build());

            mockMvc.perform(put("/api/v1/pipelines/{pipelineId}/settings", pipelineId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req))
                            .requestAttr("permissions", perms))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Can add table pair")
        void canAddTablePair() throws Exception {
            AddTablePairRequest req = new AddTablePairRequest();
            req.setSourceTable("src_tbl");
            req.setTargetTable("tgt_tbl");

            when(pipelineService.addTablePair(eq(pipelineId), any())).thenReturn(PipelineResponse.builder().id(pipelineId).build());

            mockMvc.perform(post("/api/v1/pipelines/{pipelineId}/settings/tables", pipelineId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req))
                            .requestAttr("permissions", perms))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Can remove table pair")
        void canRemoveTablePair() throws Exception {
            when(pipelineService.removeTablePair(pipelineId, tableMappingId)).thenReturn(PipelineResponse.builder().id(pipelineId).build());

            mockMvc.perform(delete("/api/v1/pipelines/{pipelineId}/settings/tables/{pipelineTableId}", pipelineId, tableMappingId)
                            .requestAttr("permissions", perms))
                    .andExpect(status().isOk());
        }
    }

    @Nested
    @DisplayName("User without settings:edit permission (unselected Edit pipeline settings)")
    class UnauthorizedUserTests {
        // User has generic pipeline edit and view permissions, but specifically lacks settings:edit
        private final Set<String> permsWithoutSettingsEdit = Set.of(Permissions.PIPELINE_VIEW, Permissions.PIPELINE_EDIT);

        @Test
        @DisplayName("Cannot get pipeline settings (HTTP 403)")
        void cannotGetSettings() throws Exception {
            mockMvc.perform(get("/api/v1/pipelines/{pipelineId}/settings", pipelineId)
                            .requestAttr("permissions", permsWithoutSettingsEdit))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403))
                    .andExpect(jsonPath("$.info.missingPermission").value(Permissions.SETTINGS_EDIT));
        }

        @Test
        @DisplayName("Cannot update pipeline settings (HTTP 403)")
        void cannotUpdateSettings() throws Exception {
            UpdatePipelineRequest req = new UpdatePipelineRequest();
            req.setName("Updated Pipeline");

            mockMvc.perform(put("/api/v1/pipelines/{pipelineId}/settings", pipelineId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req))
                            .requestAttr("permissions", permsWithoutSettingsEdit))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403))
                    .andExpect(jsonPath("$.info.missingPermission").value(Permissions.SETTINGS_EDIT));
        }

        @Test
        @DisplayName("Cannot add table pair (HTTP 403)")
        void cannotAddTablePair() throws Exception {
            AddTablePairRequest req = new AddTablePairRequest();
            req.setSourceTable("src_tbl");
            req.setTargetTable("tgt_tbl");

            mockMvc.perform(post("/api/v1/pipelines/{pipelineId}/settings/tables", pipelineId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req))
                            .requestAttr("permissions", permsWithoutSettingsEdit))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403))
                    .andExpect(jsonPath("$.info.missingPermission").value(Permissions.SETTINGS_EDIT));
        }

        @Test
        @DisplayName("Cannot remove table pair (HTTP 403)")
        void cannotRemoveTablePair() throws Exception {
            mockMvc.perform(delete("/api/v1/pipelines/{pipelineId}/settings/tables/{pipelineTableId}", pipelineId, tableMappingId)
                            .requestAttr("permissions", permsWithoutSettingsEdit))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403))
                    .andExpect(jsonPath("$.info.missingPermission").value(Permissions.SETTINGS_EDIT));
        }
    }
}
