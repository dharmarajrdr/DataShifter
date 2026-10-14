package com.datashifter.pipeline.controllers;

import com.datashifter.common.dtos.CdcDtos.*;
import com.datashifter.common.enums.Permissions;
import com.datashifter.common.security.PermissionInterceptor;
import com.datashifter.common.security.UserContext;
import com.datashifter.pipeline.services.interfaces.CdcCheckpointService;
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

import java.util.Set;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class CdcControllerSecurityTest {

    private MockMvc mockMvc;

    @Mock
    private CdcCheckpointService cdcCheckpointService;

    @InjectMocks
    private CdcController cdcController;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final String pipelineId = "pipe-cdc-1";

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(cdcController)
                .addInterceptors(new PermissionInterceptor())
                .build();
    }

    @AfterEach
    void tearDown() {
        UserContext.clear();
    }

    @Test
    @DisplayName("Viewer with cdc:view can inspect CDC checkpoint")
    void viewerCanGetCheckpoint() throws Exception {
        when(cdcCheckpointService.getCheckpoint(pipelineId))
                .thenReturn(CdcCheckpointResponse.builder()
                        .pipelineId(pipelineId)
                        .sourceFile("aa000001")
                        .lastScn("12345")
                        .build());

        mockMvc.perform(get("/api/v1/pipelines/{pipelineId}/cdc/checkpoint", pipelineId)
                        .requestAttr("permissions", Set.of(Permissions.CDC_VIEW)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.data.sourceFile").value("aa000001"));
    }

    @Test
    @DisplayName("User without cdc:view is forbidden from inspecting checkpoint")
    void userWithoutCdcViewIsForbidden() throws Exception {
        mockMvc.perform(get("/api/v1/pipelines/{pipelineId}/cdc/checkpoint", pipelineId)
                        .requestAttr("permissions", Set.of(Permissions.PIPELINE_VIEW)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Editor with cdc:manage can reset CDC checkpoint")
    void editorCanResetCheckpoint() throws Exception {
        ResetCdcCheckpointRequest req = ResetCdcCheckpointRequest.builder()
                .targetSourceFile("aa000005")
                .targetScn("99999")
                .build();

        when(cdcCheckpointService.resetCheckpoint(eq(pipelineId), any()))
                .thenReturn(CdcCheckpointResponse.builder()
                        .pipelineId(pipelineId)
                        .sourceFile("aa000005")
                        .lastScn("99999")
                        .build());

        mockMvc.perform(post("/api/v1/pipelines/{pipelineId}/cdc/checkpoint/reset", pipelineId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .requestAttr("permissions", Set.of(Permissions.CDC_MANAGE)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.lastScn").value("99999"));
    }

    @Test
    @DisplayName("User without cdc:manage cannot reset CDC checkpoint")
    void userWithoutCdcManageCannotResetCheckpoint() throws Exception {
        ResetCdcCheckpointRequest req = ResetCdcCheckpointRequest.builder().targetScn("99999").build();

        mockMvc.perform(post("/api/v1/pipelines/{pipelineId}/cdc/checkpoint/reset", pipelineId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .requestAttr("permissions", Set.of(Permissions.CDC_VIEW)))
                .andExpect(status().isForbidden());
    }
}
