package com.datashifter.connector.controllers;

import com.datashifter.common.dtos.ConnectionDtos.*;
import com.datashifter.common.enums.DatabaseType;
import com.datashifter.common.enums.Permissions;
import com.datashifter.common.security.PermissionInterceptor;
import com.datashifter.common.security.UserContext;
import com.datashifter.connector.services.interfaces.ConnectionService;
import com.datashifter.connector.services.implementations.TableOrderService;
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

import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class ConnectionControllerSecurityTest {

    private MockMvc mockMvc;

    @Mock
    private ConnectionService connectionService;

    @Mock
    private TableOrderService tableOrderService;

    @InjectMocks
    private ConnectionController connectionController;

    private ObjectMapper objectMapper = new ObjectMapper();

    private final String connId = "conn-123";

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(connectionController)
                .addInterceptors(new PermissionInterceptor())
                .build();
    }

    @AfterEach
    void tearDown() {
        UserContext.clear();
    }

    private CreateConnectionRequest sampleCreateRequest() {
        CreateConnectionRequest req = new CreateConnectionRequest();
        req.setName("Test DB");
        req.setDbType(DatabaseType.POSTGRESQL);
        req.setHost("localhost");
        req.setPort(5432);
        req.setDatabaseName("testdb");
        req.setUsername("user");
        req.setPassword("pass");
        return req;
    }

    @Nested
    @DisplayName("Admin Role Permissions (Full Access)")
    class AdminRoleTests {
        private final Set<String> adminPerms = new HashSet<>(Permissions.ALL);

        @Test
        @DisplayName("Admin can create connection")
        void adminCanCreate() throws Exception {
            CreateConnectionRequest req = sampleCreateRequest();
            when(connectionService.create(any())).thenReturn(ConnectionResponse.builder().id(connId).name("Test DB").build());

            mockMvc.perform(post("/api/v1/connections")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req))
                            .requestAttr("permissions", adminPerms))
                    .andExpect(status().isCreated());
        }

        @Test
        @DisplayName("Admin can update connection")
        void adminCanUpdate() throws Exception {
            UpdateConnectionRequest req = new UpdateConnectionRequest();
            when(connectionService.update(eq(connId), any())).thenReturn(ConnectionResponse.builder().id(connId).name("Updated").build());

            mockMvc.perform(put("/api/v1/connections/{id}", connId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req))
                            .requestAttr("permissions", adminPerms))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Admin can delete connection")
        void adminCanDelete() throws Exception {
            mockMvc.perform(delete("/api/v1/connections/{id}", connId)
                            .requestAttr("permissions", adminPerms))
                    .andExpect(status().isNoContent());
        }

        @Test
        @DisplayName("Admin can test connection")
        void adminCanTest() throws Exception {
            when(connectionService.testConnection(connId)).thenReturn(TestConnectionResponse.builder().success(true).build());

            mockMvc.perform(post("/api/v1/connections/{id}/test", connId)
                            .requestAttr("permissions", adminPerms))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Admin can browse schema tables")
        void adminCanBrowseTables() throws Exception {
            when(connectionService.listTables(connId)).thenReturn(List.of("users", "orders"));

            mockMvc.perform(get("/api/v1/connections/{id}/tables", connId)
                            .requestAttr("permissions", adminPerms))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Admin can list all connections")
        void adminCanListConnections() throws Exception {
            when(connectionService.getAll()).thenReturn(List.of());

            mockMvc.perform(get("/api/v1/connections")
                            .requestAttr("permissions", adminPerms))
                    .andExpect(status().isOk());
        }
    }

    @Nested
    @DisplayName("Editor Role Permissions (Create, Edit, Test, Browse - No Delete)")
    class EditorRoleTests {
        private final Set<String> editorPerms = new HashSet<>(Permissions.EDITOR);

        @Test
        @DisplayName("Editor can create connection")
        void editorCanCreate() throws Exception {
            CreateConnectionRequest req = sampleCreateRequest();
            when(connectionService.create(any())).thenReturn(ConnectionResponse.builder().id(connId).name("Test DB").build());

            mockMvc.perform(post("/api/v1/connections")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req))
                            .requestAttr("permissions", editorPerms))
                    .andExpect(status().isCreated());
        }

        @Test
        @DisplayName("Editor can test connection")
        void editorCanTest() throws Exception {
            when(connectionService.testConnection(connId)).thenReturn(TestConnectionResponse.builder().success(true).build());

            mockMvc.perform(post("/api/v1/connections/{id}/test", connId)
                            .requestAttr("permissions", editorPerms))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Editor can browse schema tables")
        void editorCanBrowseTables() throws Exception {
            when(connectionService.listTables(connId)).thenReturn(List.of("users"));

            mockMvc.perform(get("/api/v1/connections/{id}/tables", connId)
                            .requestAttr("permissions", editorPerms))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Editor CANNOT delete connection (HTTP 403)")
        void editorCannotDelete() throws Exception {
            mockMvc.perform(delete("/api/v1/connections/{id}", connId)
                            .requestAttr("permissions", editorPerms))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403))
                    .andExpect(jsonPath("$.info.missingPermission").value(Permissions.CONNECTION_DELETE));
        }
    }

    @Nested
    @DisplayName("Viewer Role Permissions (Read-Only: Browse Schema Only)")
    class ViewerRoleTests {
        private final Set<String> viewerPerms = new HashSet<>(Permissions.VIEWER);

        @Test
        @DisplayName("Viewer can browse schema tables")
        void viewerCanBrowseTables() throws Exception {
            when(connectionService.listTables(connId)).thenReturn(List.of("products"));

            mockMvc.perform(get("/api/v1/connections/{id}/tables", connId)
                            .requestAttr("permissions", viewerPerms))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Viewer can view connections list")
        void viewerCanListConnections() throws Exception {
            when(connectionService.getAll()).thenReturn(List.of());

            mockMvc.perform(get("/api/v1/connections")
                            .requestAttr("permissions", viewerPerms))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Viewer CANNOT test connection (HTTP 403)")
        void viewerCannotTest() throws Exception {
            mockMvc.perform(post("/api/v1/connections/{id}/test", connId)
                            .requestAttr("permissions", viewerPerms))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403))
                    .andExpect(jsonPath("$.info.missingPermission").value(Permissions.CONNECTION_TEST));
        }

        @Test
        @DisplayName("Viewer CANNOT create connection (HTTP 403)")
        void viewerCannotCreate() throws Exception {
            CreateConnectionRequest req = sampleCreateRequest();

            mockMvc.perform(post("/api/v1/connections")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req))
                            .requestAttr("permissions", viewerPerms))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403))
                    .andExpect(jsonPath("$.info.missingPermission").value(Permissions.CONNECTION_CREATE));
        }

        @Test
        @DisplayName("Viewer CANNOT update connection (HTTP 403)")
        void viewerCannotUpdate() throws Exception {
            UpdateConnectionRequest req = new UpdateConnectionRequest();

            mockMvc.perform(put("/api/v1/connections/{id}", connId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req))
                            .requestAttr("permissions", viewerPerms))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403))
                    .andExpect(jsonPath("$.info.missingPermission").value(Permissions.CONNECTION_EDIT));
        }

        @Test
        @DisplayName("Viewer CANNOT delete connection (HTTP 403)")
        void viewerCannotDelete() throws Exception {
            mockMvc.perform(delete("/api/v1/connections/{id}", connId)
                            .requestAttr("permissions", viewerPerms))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403))
                    .andExpect(jsonPath("$.info.missingPermission").value(Permissions.CONNECTION_DELETE));
        }
    }

    @Nested
    @DisplayName("Custom Role Missing Specific Permissions")
    class CustomRoleTests {

        @Test
        @DisplayName("Custom role without connection:test cannot test connection")
        void customRoleWithoutTestBlocked() throws Exception {
            Set<String> perms = Set.of(Permissions.CONNECTION_CREATE, Permissions.CONNECTION_BROWSE_SCHEMA);

            mockMvc.perform(post("/api/v1/connections/{id}/test", connId)
                            .requestAttr("permissions", perms))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.info.missingPermission").value(Permissions.CONNECTION_TEST));
        }

        @Test
        @DisplayName("Custom role without connection:browse_schema cannot list tables")
        void customRoleWithoutBrowseBlocked() throws Exception {
            Set<String> perms = Set.of(Permissions.CONNECTION_CREATE, Permissions.CONNECTION_TEST);

            mockMvc.perform(get("/api/v1/connections/{id}/tables", connId)
                            .requestAttr("permissions", perms))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.info.missingPermission").value(Permissions.CONNECTION_BROWSE_SCHEMA));
        }

        @Test
        @DisplayName("Custom role without any connection/pipeline permissions cannot list connections")
        void customRoleWithoutAnyConnectionPermissionsBlocked() throws Exception {
            Set<String> perms = Set.of(Permissions.ORG_VIEW_AUDIT);

            mockMvc.perform(get("/api/v1/connections")
                            .requestAttr("permissions", perms))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403));
        }
    }
}
