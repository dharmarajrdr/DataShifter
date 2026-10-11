package com.datashifter.pipeline.validation.datatype;

import com.datashifter.common.enums.DatabaseType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * Factory that auto-discovers all {@link DatabaseTypeDialect} implementations via Spring DI.
 *
 * Adding support for a new database requires only creating a {@code @Component}
 * implementing {@link DatabaseTypeDialect}.
 */
@Component
public class DatabaseTypeDialectFactory {

    private final Map<DatabaseType, DatabaseTypeDialect> dialectMap = new EnumMap<>(DatabaseType.class);

    public DatabaseTypeDialectFactory() {
        this(List.of(new OracleTypeDialect(), new PostgresTypeDialect()));
    }

    @Autowired
    public DatabaseTypeDialectFactory(List<DatabaseTypeDialect> dialects) {
        if (dialects != null) {
            for (DatabaseTypeDialect d : dialects) {
                if (d != null && d.getDatabaseType() != null) {
                    dialectMap.put(d.getDatabaseType(), d);
                }
            }
        }
    }

    public DatabaseTypeDialect getDialect(DatabaseType dbType) {
        if (dbType == null) {
            return null;
        }
        return dialectMap.get(dbType);
    }
}
