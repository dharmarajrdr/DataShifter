package com.datashifter.connector.services.implementations;

import com.datashifter.common.dtos.ConnectionDtos.*;
import com.datashifter.common.enums.ConnectionStatus;
import com.datashifter.common.exceptions.DatashifterException;
import com.datashifter.common.exceptions.ResourceNotFoundException;
import com.datashifter.common.models.AppUser;
import com.datashifter.common.models.Connection;
import com.datashifter.common.repositories.CommonPipelineRepository;
import com.datashifter.common.security.UserContext;
import com.datashifter.common.services.SubscriptionLimitChecker;
import com.datashifter.common.utils.EncryptionUtil;
import com.datashifter.connector.factories.ConnectorFactory;
import com.datashifter.connector.repositories.ConnectionRepository;
import com.datashifter.connector.services.interfaces.ConnectionService;
import com.datashifter.connector.spi.interfaces.ConnectionConfig;
import com.datashifter.connector.spi.interfaces.DatabaseConnector;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ConnectionServiceImpl implements ConnectionService {

    private final ConnectionRepository repository;
    private final ConnectorFactory connectorFactory;
    private final EntityManager entityManager;
    private final SubscriptionLimitChecker limitChecker;
    private final CommonPipelineRepository pipelineRepository;

    @Override
    @Transactional
    @Tool(description = "Create a new database connection with name, dbType (POSTGRESQL, MYSQL, ORACLE, SQL_SERVER, SPANNER), host, port, databaseName, schemaName, username, and password.")
    public ConnectionResponse create(
            @ToolParam(description = "Connection creation parameters including name, dbType, host, port, databaseName, schemaName, username, and password") CreateConnectionRequest request) {
        // Enforce subscription limit
        String orgId = UserContext.getCurrentOrgId();
        long currentCount = repository.findByOrgId(orgId).size();
        limitChecker.assertCanCreateConnection(orgId, currentCount);

        AppUser createdBy = entityManager.getReference(AppUser.class, UserContext.getCurrentUserId());
        Connection entity = Connection.builder()
                .name(request.getName())
                .createdBy(createdBy)
                .dbType(request.getDbType())
                .dbVersion(request.getDbVersion())
                .host(request.getHost())
                .port(request.getPort())
                .databaseName(request.getDatabaseName())
                .schemaName(request.getSchemaName())
                .username(request.getUsername())
                .encryptedPassword(EncryptionUtil.encrypt(request.getPassword()))
                .extraProperties(request.getExtraProperties())
                .status(ConnectionStatus.CREATED)
                .build();
        entity = repository.save(entity);
        return toResponse(entity, 0, Collections.emptyList());
    }

    @Override
    @Transactional
    @Tool(description = "Update an existing database connection's name, host, port, databaseName, schemaName, username, or password by connection ID.")
    public ConnectionResponse update(
            @ToolParam(description = "The unique ID of the database connection to update") String id,
            @ToolParam(description = "Updated connection fields") UpdateConnectionRequest request) {
        Connection entity = findEntity(id);
        if (request.getName() != null) entity.setName(request.getName());
        if (request.getHost() != null) entity.setHost(request.getHost());
        if (request.getPort() != null) entity.setPort(request.getPort());
        if (request.getDatabaseName() != null) entity.setDatabaseName(request.getDatabaseName());
        if (request.getSchemaName() != null) entity.setSchemaName(request.getSchemaName());
        if (request.getUsername() != null) entity.setUsername(request.getUsername());
        if (request.getPassword() != null) entity.setEncryptedPassword(EncryptionUtil.encrypt(request.getPassword()));
        entity = repository.save(entity);
        List<String> pipelines = pipelineRepository.findPipelineNamesByConnectionId(id);
        return toResponse(entity, pipelines.size(), pipelines);
    }

    @Override
    @Transactional(readOnly = true)
    @Tool(description = "Get details, connectivity status, table count, and referenced pipelines for a specific database connection by ID.")
    public ConnectionResponse getById(
            @ToolParam(description = "The unique ID of the database connection") String id) {
        Connection entity = findEntity(id);
        List<String> pipelines = pipelineRepository.findPipelineNamesByConnectionId(id);
        return toResponse(entity, pipelines.size(), pipelines);
    }

    @Override
    @Transactional(readOnly = true)
    @Tool(description = "List all database connections configured in the current organization with their DB type, host, database name, status, and pipeline usage.")
    public List<ConnectionResponse> getAll() {
        String orgId = UserContext.getCurrentOrgId();
        List<Connection> connections = repository.findByOrgId(orgId);
        if (connections.isEmpty()) {
            return Collections.emptyList();
        }

        Map<String, List<String>> pipelineRefs = new HashMap<>();
        List<Object[]> rows = pipelineRepository.findAllPipelineConnectionUsage();
        for (Object[] row : rows) {
            String sourceId = (String) row[0];
            String targetId = (String) row[1];
            String pipelineName = (String) row[2];
            if (sourceId != null) {
                pipelineRefs.computeIfAbsent(sourceId, k -> new ArrayList<>()).add(pipelineName);
            }
            if (targetId != null) {
                pipelineRefs.computeIfAbsent(targetId, k -> new ArrayList<>()).add(pipelineName);
            }
        }

        return connections.stream()
                .map(c -> {
                    List<String> pipelines = pipelineRefs.getOrDefault(c.getId(), Collections.emptyList());
                    return toResponse(c, pipelines.size(), pipelines);
                })
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    @Tool(description = "Delete a database connection by ID if it is not referenced by any pipeline.")
    public void delete(
            @ToolParam(description = "The unique ID of the database connection to delete") String id) {
        Connection entity = findEntity(id);
        List<String> pipelineNames = pipelineRepository.findPipelineNamesByConnectionId(id);
        if (!pipelineNames.isEmpty()) {
            throw new DatashifterException(String.format(
                    "Cannot delete connection '%s'. It is referenced by %d pipeline(s): %s. Please delete or reassign those pipelines first.",
                    entity.getName(),
                    pipelineNames.size(),
                    String.join(", ", pipelineNames)
            ));
        }
        repository.deleteById(id);
    }

    @Override
    @Transactional
    @Tool(description = "Test connectivity and measure latency for a database connection by ID, updating its status and discovered table count.")
    public TestConnectionResponse testConnection(
            @ToolParam(description = "The unique ID of the database connection to test") String id) {
        Connection entity = findEntity(id);
        DatabaseConnector connector = connectorFactory.getConnector(entity.getDbType());
        ConnectionConfig config = buildConfig(entity);
        try {
            long latency = connector.testConnection(config);
            List<String> tables = connector.listTables(config);
            entity.setStatus(ConnectionStatus.CONNECTED);
            entity.setTableCount(tables.size());
            entity.setLastTestedAt(Instant.now());
            entity.setLastError(null);
            repository.save(entity);
            return TestConnectionResponse.builder()
                    .success(true).message("Connected successfully")
                    .tableCount(tables.size()).latencyMs(latency).build();
        } catch (Exception e) {
            entity.setStatus(ConnectionStatus.FAILED);
            entity.setLastTestedAt(Instant.now());
            entity.setLastError(e.getMessage());
            repository.save(entity);
            return TestConnectionResponse.builder()
                    .success(false).message(e.getMessage()).build();
        }
    }

    @Override
    @Transactional(readOnly = true)
    @Tool(description = "List all table names present in the database for a given connection ID.")
    public List<String> listTables(
            @ToolParam(description = "The unique ID of the database connection") String connectionId) {
        Connection entity = findEntity(connectionId);
        DatabaseConnector connector = connectorFactory.getConnector(entity.getDbType());
        return connector.listTables(buildConfig(entity));
    }

    @Override
    @Transactional(readOnly = true)
    @Tool(description = "Get table schema metadata (columns, data types, nullable flags, primary key flags, and row count) for a table in a database connection.")
    public TableMetadata getTableMetadata(
            @ToolParam(description = "The unique ID of the database connection") String connectionId,
            @ToolParam(description = "The exact table name to inspect") String tableName) {
        Connection entity = findEntity(connectionId);
        DatabaseConnector connector = connectorFactory.getConnector(entity.getDbType());
        return connector.getTableMetadata(buildConfig(entity), tableName);
    }

    @Override
    @Transactional(readOnly = true)
    @Tool(description = "Get foreign key constraints (column, referenced parent table, referenced parent column, constraint name) for a table in a database connection.")
    public List<ForeignKeyMetadata> getForeignKeys(
            @ToolParam(description = "The unique ID of the database connection") String connectionId,
            @ToolParam(description = "The exact table name to inspect foreign keys for") String tableName) {
        Connection entity = findEntity(connectionId);
        DatabaseConnector connector = connectorFactory.getConnector(entity.getDbType());
        return connector.getForeignKeys(buildConfig(entity), tableName);
    }

    private Connection findEntity(String id) {
        Connection conn = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Connection", id));
        String currentOrgId = UserContext.getCurrentOrgId();
        if (currentOrgId != null && conn.getCreatedBy() != null
                && conn.getCreatedBy().getOrganization() != null
                && !currentOrgId.equals(conn.getCreatedBy().getOrganization().getId())) {
            throw new DatashifterException("Connection not found or access denied");
        }
        return conn;
    }

    private ConnectionConfig buildConfig(Connection entity) {
        return ConnectionConfig.builder()
                .connectionId(entity.getId())
                .dbType(entity.getDbType())
                .host(entity.getHost())
                .port(entity.getPort())
                .databaseName(entity.getDatabaseName())
                .schemaName(entity.getSchemaName())
                .username(entity.getUsername())
                .password(EncryptionUtil.decrypt(entity.getEncryptedPassword()))
                .build();
    }

    private ConnectionResponse toResponse(Connection e, int pipelineCount, List<String> referencedPipelines) {
        return ConnectionResponse.builder()
                .id(e.getId()).name(e.getName()).dbType(e.getDbType()).dbVersion(e.getDbVersion())
                .host(e.getHost()).port(e.getPort()).databaseName(e.getDatabaseName())
                .schemaName(e.getSchemaName()).status(e.getStatus()).tableCount(e.getTableCount())
                .lastTestedAt(e.getLastTestedAt()).lastError(e.getLastError()).createdAt(e.getCreatedAt())
                .pipelineCount(pipelineCount)
                .referencedPipelines(referencedPipelines)
                .build();
    }

    private ConnectionResponse toResponse(Connection e) {
        List<String> pipelines = pipelineRepository.findPipelineNamesByConnectionId(e.getId());
        return toResponse(e, pipelines.size(), pipelines);
    }
}