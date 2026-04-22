package com.datashifter.connector.services.interfaces;

import com.datashifter.common.dtos.ConnectionDtos.*;

import java.util.List;

public interface ConnectionService {

    ConnectionResponse create(CreateConnectionRequest request);

    ConnectionResponse update(String id, UpdateConnectionRequest request);

    ConnectionResponse getById(String id);

    List<ConnectionResponse> getAll();

    void delete(String id);

    TestConnectionResponse testConnection(String id);

    List<String> listTables(String connectionId);

    TableMetadata getTableMetadata(String connectionId, String tableName);

    List<ForeignKeyMetadata> getForeignKeys(String connectionId, String tableName);
}
