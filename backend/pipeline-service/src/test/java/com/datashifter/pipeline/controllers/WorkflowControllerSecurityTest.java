package com.datashifter.pipeline.controllers;

import com.datashifter.common.dtos.WorkflowDtos.*;
import com.datashifter.common.enums.Permissions;
import com.datashifter.common.security.PermissionInterceptor;
import com.datashifter.common.security.UserContext;
import com.datashifter.pipeline.services.interfaces.WorkflowService;
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
class WorkflowControllerSecurityTest {

    private MockMvc mockMvc;

    @Mock
    private WorkflowService workflowService;

    @InjectMocks
    private WorkflowController workflowController;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final String workflowId = "wf-123";

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(workflowController)
                .addInterceptors(new PermissionInterceptor())
                .build();
    }

    @AfterEach
    void tearDown() {
        UserContext.clear();
    }

    @Test
    @DisplayName("Admin can create, view, edit, run, and delete workflows")
    void adminHasFullWorkflowAccess() throws Exception {
        CreateWorkflowRequest createReq = CreateWorkflowRequest.builder()
                .name("Customer Migration Workflow")
                .build();
        when(workflowService.create(any())).thenReturn(WorkflowResponse.builder().id(workflowId).name("Customer Migration Workflow").build());
        when(workflowService.getById(workflowId)).thenReturn(WorkflowResponse.builder().id(workflowId).build());

        Set<String> adminPerms = new HashSet<>(Permissions.ALL);

        mockMvc.perform(post("/api/v1/workflows")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createReq))
                        .requestAttr("permissions", adminPerms))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/v1/workflows/{id}", workflowId)
                        .requestAttr("permissions", adminPerms))
                .andExpect(status().isOk());

        mockMvc.perform(delete("/api/v1/workflows/{id}", workflowId)
                        .requestAttr("permissions", adminPerms))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("Editor can create, edit, and run workflows, but CANNOT delete workflows (HTTP 403)")
    void editorCanCreateEditRunButCannotDeleteWorkflow() throws Exception {
        CreateWorkflowRequest createReq = CreateWorkflowRequest.builder()
                .name("Editor Workflow")
                .build();
        SaveWorkflowCanvasRequest canvasReq = SaveWorkflowCanvasRequest.builder()
                .nodes(List.of())
                .edges(List.of())
                .build();
        WorkflowActionRequest runReq = WorkflowActionRequest.builder()
                .action(WorkflowAction.START)
                .build();

        when(workflowService.create(any())).thenReturn(WorkflowResponse.builder().id(workflowId).build());
        when(workflowService.saveCanvas(eq(workflowId), any())).thenReturn(WorkflowResponse.builder().id(workflowId).build());
        when(workflowService.performAction(eq(workflowId), any())).thenReturn(WorkflowResponse.builder().id(workflowId).build());

        Set<String> editorPerms = new HashSet<>(Permissions.EDITOR);

        mockMvc.perform(post("/api/v1/workflows")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createReq))
                        .requestAttr("permissions", editorPerms))
                .andExpect(status().isCreated());

        mockMvc.perform(put("/api/v1/workflows/{id}/canvas", workflowId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(canvasReq))
                        .requestAttr("permissions", editorPerms))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/workflows/{id}/actions", workflowId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(runReq))
                        .requestAttr("permissions", editorPerms))
                .andExpect(status().isOk());

        mockMvc.perform(delete("/api/v1/workflows/{id}", workflowId)
                        .requestAttr("permissions", editorPerms))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.info.missingPermission").value(Permissions.WORKFLOW_DELETE));
    }

    @Test
    @DisplayName("Viewer can view workflows, but CANNOT create, edit, run, or delete workflows (HTTP 403)")
    void viewerCanOnlyViewWorkflows() throws Exception {
        CreateWorkflowRequest createReq = CreateWorkflowRequest.builder().name("Viewer Workflow").build();
        SaveWorkflowCanvasRequest canvasReq = SaveWorkflowCanvasRequest.builder().build();
        WorkflowActionRequest runReq = WorkflowActionRequest.builder().action(WorkflowAction.START).build();

        when(workflowService.getAll()).thenReturn(List.of());
        when(workflowService.getById(workflowId)).thenReturn(WorkflowResponse.builder().id(workflowId).build());

        Set<String> viewerPerms = new HashSet<>(Permissions.VIEWER);

        mockMvc.perform(get("/api/v1/workflows")
                        .requestAttr("permissions", viewerPerms))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/workflows/{id}", workflowId)
                        .requestAttr("permissions", viewerPerms))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/workflows")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createReq))
                        .requestAttr("permissions", viewerPerms))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.info.missingPermission").value(Permissions.WORKFLOW_CREATE));

        mockMvc.perform(put("/api/v1/workflows/{id}/canvas", workflowId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(canvasReq))
                        .requestAttr("permissions", viewerPerms))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.info.missingPermission").value(Permissions.WORKFLOW_EDIT));

        mockMvc.perform(post("/api/v1/workflows/{id}/actions", workflowId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(runReq))
                        .requestAttr("permissions", viewerPerms))
                .andExpect(status().isForbidden());
    }
}
