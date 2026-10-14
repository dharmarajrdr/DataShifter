package com.datashifter.connector.factories;

import com.datashifter.common.cdc.CdcSourceReader;
import com.datashifter.common.enums.DatabaseType;
import com.datashifter.common.exceptions.DatashifterException;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Factory that auto-discovers all CdcSourceReader implementations via Spring DI.
 */
@Component
public class CdcSourceReaderFactory {

    private final Map<DatabaseType, CdcSourceReader> readerMap;

    public CdcSourceReaderFactory(List<CdcSourceReader> readers) {
        this.readerMap = readers.stream()
                .collect(Collectors.toMap(
                        CdcSourceReader::getSupportedType,
                        Function.identity(),
                        (existing, duplicate) -> existing
                ));
    }

    public CdcSourceReader getReader(DatabaseType dbType) {
        CdcSourceReader reader = readerMap.get(dbType);
        if (reader == null) {
            throw new DatashifterException("No CDC source reader registered for database type: " + dbType);
        }
        return reader;
    }

    public boolean isSupported(DatabaseType dbType) {
        return readerMap.containsKey(dbType);
    }

    public List<DatabaseType> getSupportedTypes() {
        return List.copyOf(readerMap.keySet());
    }
}
