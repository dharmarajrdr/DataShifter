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
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class PipelineControllerSecurityTest {

    private MockMvc mockMvc;

    @Mock
    private PipelineService pipelineService;

    @InjectMocks
    private PipelineController pipelineController;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final String pipelineId = "pipe-123";

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(pipelineController)
                .addInterceptors(new PermissionInterceptor())
                .build();
    }

    @AfterEach
    void tearDown() {
        UserContext.clear();
    }

    @Test
    @DisplayName("Admin can create pipeline")
    void adminCanCreatePipeline() throws Exception {
        CreatePipelineRequest req = new CreatePipelineRequest();
        req.setName("Test Pipeline");
        req.setSourceConnectionId("conn-src");
        req.setTargetConnectionId("conn-tgt");

        when(pipelineService.create(any())).thenReturn(PipelineResponse.builder().id(pipelineId).name("Test Pipeline").build());

        mockMvc.perform(post("/api/v1/pipelines")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .requestAttr("permissions", new HashSet<>(Permissions.ALL)))
                .andExpect(status().isCreated());
    }

    @Test
    @DisplayName("Viewer can get pipeline details")
    void viewerCanGetPipeline() throws Exception {
        when(pipelineService.getById(pipelineId)).thenReturn(PipelineResponse.builder().id(pipelineId).build());

        mockMvc.perform(get("/api/v1/pipelines/{id}", pipelineId)
                        .requestAttr("permissions", Set.of(Permissions.PIPELINE_VIEW)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Viewer CANNOT create pipeline (HTTP 403)")
    void viewerCannotCreatePipeline() throws Exception {
        CreatePipelineRequest req = new CreatePipelineRequest();
        req.setName("Test Pipeline");
        req.setSourceConnectionId("conn-src");
        req.setTargetConnectionId("conn-tgt");

        mockMvc.perform(post("/api/v1/pipelines")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .requestAttr("permissions", Set.of(Permissions.PIPELINE_VIEW)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.info.missingPermission").value(Permissions.PIPELINE_CREATE));
    }

    @Test
    @DisplayName("Viewer CANNOT delete pipeline (HTTP 403)")
    void viewerCannotDeletePipeline() throws Exception {
        mockMvc.perform(delete("/api/v1/pipelines/{id}", pipelineId)
                        .requestAttr("permissions", Set.of(Permissions.PIPELINE_VIEW)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.info.missingPermission").value(Permissions.PIPELINE_DELETE));
    }

    @Test
    @DisplayName("Viewer CANNOT update pipeline (HTTP 403)")
    void viewerCannotUpdatePipeline() throws Exception {
        UpdatePipelineRequest req = new UpdatePipelineRequest();
        req.setName("Updated");

        mockMvc.perform(put("/api/v1/pipelines/{id}", pipelineId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .requestAttr("permissions", Set.of(Permissions.PIPELINE_VIEW)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.info.missingPermission").value(Permissions.PIPELINE_EDIT));
    }

    @Test
    @DisplayName("Viewer CANNOT execute pipeline actions (HTTP 403)")
    void viewerCannotExecuteAction() throws Exception {
        PipelineActionRequest req = new PipelineActionRequest();
        req.setAction(PipelineAction.START);

        mockMvc.perform(post("/api/v1/pipelines/{id}/actions", pipelineId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .requestAttr("permissions", Set.of(Permissions.PIPELINE_VIEW)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
    }

    @Test
    @DisplayName("User with PIPELINE_RUN can execute performAction endpoint")
    void runnerCanExecuteAction() throws Exception {
        PipelineActionRequest req = new PipelineActionRequest();
        req.setAction(PipelineAction.START);

        when(pipelineService.performAction(eq(pipelineId), any(PipelineActionRequest.class)))
                .thenReturn(PipelineResponse.builder().id(pipelineId).build());

        mockMvc.perform(post("/api/v1/pipelines/{id}/actions", pipelineId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .requestAttr("permissions", Set.of(Permissions.PIPELINE_RUN)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("User without PIPELINE_VIEW CANNOT list pipelines (HTTP 403)")
    void userWithoutViewCannotListPipelines() throws Exception {
        mockMvc.perform(get("/api/v1/pipelines")
                        .requestAttr("permissions", Set.of(Permissions.PIPELINE_CREATE, Permissions.PIPELINE_EDIT)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.info.missingPermission").value(Permissions.PIPELINE_VIEW));
    }

    @Test
    @DisplayName("User with PIPELINE_VIEW can export pipeline")
    void userWithViewCanExport() throws Exception {
        when(pipelineService.exportPipeline(pipelineId))
                .thenReturn(PipelineExportDto.builder().version(1).build());

        mockMvc.perform(get("/api/v1/pipelines/{id}/export", pipelineId)
                        .requestAttr("permissions", Set.of(Permissions.PIPELINE_VIEW)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.version").value(1));
    }

    @Test
    @DisplayName("User without PIPELINE_CREATE cannot import pipeline (HTTP 403)")
    void userWithoutCreateCannotImport() throws Exception {
        PipelineExportDto dto = PipelineExportDto.builder().version(1).build();

        mockMvc.perform(post("/api/v1/pipelines/import")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto))
                        .requestAttr("permissions", Set.of(Permissions.PIPELINE_VIEW)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.info.missingPermission").value(Permissions.PIPELINE_CREATE));
    }
}

