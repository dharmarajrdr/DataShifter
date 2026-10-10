package com.datashifter.connector.services;

import com.datashifter.common.dtos.ConnectionDtos.ConnectionResponse;
import com.datashifter.common.enums.ConnectionStatus;
import com.datashifter.common.enums.DatabaseType;
import com.datashifter.common.exceptions.DatashifterException;
import com.datashifter.common.models.AppUser;
import com.datashifter.common.models.Connection;
import com.datashifter.common.models.Organization;
import com.datashifter.common.repositories.CommonPipelineRepository;
import com.datashifter.common.security.UserContext;
import com.datashifter.connector.factories.ConnectorFactory;
import com.datashifter.connector.repositories.ConnectionRepository;
import com.datashifter.connector.services.implementations.ConnectionServiceImpl;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ConnectionServiceImplTest {

    @Mock
    private ConnectionRepository repository;

    @Mock
    private ConnectorFactory connectorFactory;

    @Mock
    private EntityManager entityManager;

    @Mock
    private CommonPipelineRepository pipelineRepository;

    @InjectMocks
    private ConnectionServiceImpl connectionService;

    private Connection sampleConn;
    private Organization sampleOrg;
    private AppUser sampleUser;

    @BeforeEach
    void setUp() {
        sampleOrg = Organization.builder().name("Test Org").build();
        sampleOrg.setId("org-1");

        sampleUser = AppUser.builder().fullName("Test User").organization(sampleOrg).build();
        sampleUser.setId("user-1");

        sampleConn = Connection.builder()
                .name("Postgres Prod")
                .dbType(DatabaseType.POSTGRESQL)
                .host("localhost")
                .port(5432)
                .databaseName("mydb")
                .schemaName("public")
                .status(ConnectionStatus.CONNECTED)
                .createdBy(sampleUser)
                .build();
        sampleConn.setId("conn-1");

        UserContext.set(UserContext.Context.builder()
                .orgId("org-1")
                .userId("user-1")
                .build());
    }

    @AfterEach
    void tearDown() {
        UserContext.clear();
    }

    @Test
    void delete_whenNotReferencedByPipelines_succeeds() {
        when(repository.findById("conn-1")).thenReturn(Optional.of(sampleConn));
        when(pipelineRepository.findPipelineNamesByConnectionId("conn-1")).thenReturn(List.of());

        connectionService.delete("conn-1");

        verify(repository, times(1)).deleteById("conn-1");
    }

    @Test
    void delete_whenReferencedByPipelines_throwsDatashifterException() {
        when(repository.findById("conn-1")).thenReturn(Optional.of(sampleConn));
        when(pipelineRepository.findPipelineNamesByConnectionId("conn-1")).thenReturn(List.of("Customer Sync", "Orders ETL"));

        assertThatThrownBy(() -> connectionService.delete("conn-1"))
                .isInstanceOf(DatashifterException.class)
                .hasMessageContaining("Cannot delete connection 'Postgres Prod'")
                .hasMessageContaining("referenced by 2 pipeline(s): Customer Sync, Orders ETL");

        verify(repository, never()).deleteById(anyString());
    }

    @Test
    void getAll_populatesPipelineUsage() {
        when(repository.findByOrgId("org-1")).thenReturn(List.of(sampleConn));
        when(pipelineRepository.findAllPipelineConnectionUsage()).thenReturn(List.of(
                new Object[]{"conn-1", "conn-2", "Pipeline A"},
                new Object[]{"conn-other", "conn-1", "Pipeline B"}
        ));

        List<ConnectionResponse> result = connectionService.getAll();

        assertThat(result).hasSize(1);
        ConnectionResponse res = result.get(0);
        assertThat(res.getPipelineCount()).isEqualTo(2);
        assertThat(res.getReferencedPipelines()).containsExactly("Pipeline A", "Pipeline B");
    }

    @Test
    void getById_populatesPipelineUsage() {
        when(repository.findById("conn-1")).thenReturn(Optional.of(sampleConn));
        when(pipelineRepository.findPipelineNamesByConnectionId("conn-1")).thenReturn(List.of("Pipeline A"));

        ConnectionResponse res = connectionService.getById("conn-1");

        assertThat(res.getPipelineCount()).isEqualTo(1);
        assertThat(res.getReferencedPipelines()).containsExactly("Pipeline A");
    }
}
