package com.datashifter.connector.factories;

import com.datashifter.common.enums.DatabaseType;
import com.datashifter.common.exceptions.DatashifterException;
import com.datashifter.connector.spi.interfaces.CdcTargetWriter;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Factory that auto-discovers all CdcTargetWriter implementations via Spring DI.
 */
@Component
public class CdcTargetWriterFactory {

    private final Map<DatabaseType, CdcTargetWriter> writerMap;

    public CdcTargetWriterFactory(List<CdcTargetWriter> writers) {
        this.writerMap = writers.stream()
                .collect(Collectors.toMap(
                        CdcTargetWriter::getSupportedType,
                        Function.identity(),
                        (existing, duplicate) -> existing
                ));
    }

    public CdcTargetWriter getWriter(DatabaseType dbType) {
        CdcTargetWriter writer = writerMap.get(dbType);
        if (writer == null) {
            throw new DatashifterException("No CDC target writer registered for database type: " + dbType);
        }
        return writer;
    }

    public boolean isSupported(DatabaseType dbType) {
        return writerMap.containsKey(dbType);
    }

    public List<DatabaseType> getSupportedTypes() {
        return List.copyOf(writerMap.keySet());
    }
}
