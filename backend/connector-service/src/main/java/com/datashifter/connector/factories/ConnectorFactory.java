package com.datashifter.connector.factories;

import com.datashifter.common.enums.DatabaseType;
import com.datashifter.common.exceptions.DatashifterException;
import com.datashifter.connector.spi.interfaces.DatabaseConnector;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Factory that auto-discovers all DatabaseConnector implementations via Spring DI.
 *
 * To add a new database:
 * 1. Implement DatabaseConnector interface
 * 2. Annotate with @Component
 * 3. Return correct DatabaseType from getSupportedType()
 * 4. Done — factory picks it up automatically.
 */
@Component
public class ConnectorFactory {

    private final Map<DatabaseType, DatabaseConnector> connectorMap;

    public ConnectorFactory(List<DatabaseConnector> connectors) {
        this.connectorMap = connectors.stream()
                .collect(Collectors.toMap(
                        DatabaseConnector::getSupportedType,
                        Function.identity()
                ));
    }

    public DatabaseConnector getConnector(DatabaseType dbType) {
        DatabaseConnector connector = connectorMap.get(dbType);
        if (connector == null) {
            throw new DatashifterException("No connector registered for database type: " + dbType);
        }
        return connector;
    }

    public boolean isSupported(DatabaseType dbType) {
        return connectorMap.containsKey(dbType);
    }

    public List<DatabaseType> getSupportedTypes() {
        return List.copyOf(connectorMap.keySet());
    }
}
