package com.datashifter.udf.services;

import com.datashifter.common.dtos.UdfDtos.UdfResponse;
import com.datashifter.common.exceptions.DatashifterException;
import com.datashifter.common.models.UdfDefinition;
import com.datashifter.common.repositories.UdfDefinitionRepository;
import com.datashifter.common.security.UserContext;
import com.datashifter.udf.storage.UdfArtifactStorage;
import com.datashifter.udf.validation.UdfArtifactValidator;
import com.datashifter.udf.validation.UdfFunctionDiscovery;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.Resource;
import org.springframework.jdbc.core.JdbcTemplate;

import java.io.File;
import java.nio.file.Path;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UdfRegistryServiceTest {
    @Mock private UdfDefinitionRepository repository;
    @Mock private UdfArtifactValidator validator;
    @Mock private UdfFunctionDiscovery discovery;
    @Mock private UdfArtifactStorage storage;
    @Mock private JdbcTemplate jdbcTemplate;

    private UdfRegistryService service;

    @BeforeEach
    void setUp() {
        service = new UdfRegistryService(repository, validator, discovery, storage, jdbcTemplate);
        UserContext.set(UserContext.Context.builder().orgId("org-123").userId("user-1").build());
    }

    @AfterEach
    void tearDown() { UserContext.clear(); }

    @Test
    void getByIdReturnsResponse() {
        UdfDefinition udf = UdfDefinition.builder().organizationId("org-123").name("my-udf").build();
        udf.setId("u1");
        when(repository.findById("u1")).thenReturn(Optional.of(udf));
        UdfResponse res = service.getById("u1");
        assertNotNull(res);
        assertEquals("my-udf", res.getName());
    }

    @Test
    void getByIdThrowsOnNotFoundOrWrongOrg() {
        when(repository.findById("u1")).thenReturn(Optional.empty());
        assertThrows(DatashifterException.class, () -> service.getById("u1"));

        UdfDefinition udf = UdfDefinition.builder().organizationId("other-org").name("my-udf").build();
        udf.setId("u2");
        when(repository.findById("u2")).thenReturn(Optional.of(udf));
        assertThrows(DatashifterException.class, () -> service.getById("u2"));
    }

    @Test
    void loadArtifactThrowsWhenNotFoundOnDisk() {
        UdfDefinition udf = UdfDefinition.builder().organizationId("org-123").storageKey("key.jar").build();
        udf.setId("u1");
        when(repository.findById("u1")).thenReturn(Optional.of(udf));
        when(storage.getFilePath("key.jar")).thenReturn(Path.of("/nonexistent/key.jar"));
        assertThrows(DatashifterException.class, () -> service.loadArtifact("u1"));
    }

    @Test
    void loadArtifactSuccessWhenFileExists() throws Exception {
        File temp = File.createTempFile("test-udf", ".jar");
        temp.deleteOnExit();
        UdfDefinition udf = UdfDefinition.builder().organizationId("org-123").storageKey("key.jar").build();
        udf.setId("u1");
        when(repository.findById("u1")).thenReturn(Optional.of(udf));
        when(storage.getFilePath("key.jar")).thenReturn(temp.toPath());
        Resource res = service.loadArtifact("u1");
        assertNotNull(res);
        assertTrue(res.exists());
    }
}
