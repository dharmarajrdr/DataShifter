package com.datashifter.execution.adapters;

import com.datashifter.adapter.sdk.AdapterConfig;
import com.datashifter.adapter.sdk.DataReader;
import com.datashifter.adapter.sdk.DataWriter;
import com.datashifter.common.exceptions.DatashifterException;
import com.datashifter.common.repositories.AdapterDefinitionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * Manages loading, instantiation and lifecycle of DataReader and DataWriter adapters (<= 100 lines).
 */
@Service
@Slf4j
public class AdapterExecutionManager {
    private final AdapterClassLoader classLoader;
    private final ObjectMapper objectMapper;

    @org.springframework.beans.factory.annotation.Autowired
    public AdapterExecutionManager(AdapterClassLoader classLoader, ObjectMapper objectMapper) {
        this.classLoader = classLoader;
        this.objectMapper = objectMapper;
    }

    public AdapterExecutionManager(String storageRootPath, AdapterDefinitionRepository definitionRepo, ObjectMapper objectMapper) {
        this(new AdapterClassLoader(storageRootPath, definitionRepo), objectMapper);
    }

    private final Map<String, DataWriter> writerCache = new java.util.concurrent.ConcurrentHashMap<>();
    private final Map<String, DataReader> readerCache = new java.util.concurrent.ConcurrentHashMap<>();

    public DataReader getReader(String adapterKeyOrId, AdapterConfig config) {
        String k = adapterKeyOrId + ":" + (config != null ? config.getProperties().hashCode() : 0);
        return readerCache.computeIfAbsent(k, key -> {
            LoadedAdapterClass loaded = classLoader.loadAdapterClass(adapterKeyOrId);
            try {
                Object inst = loaded.getClazz().getDeclaredConstructor().newInstance();
                if (!(inst instanceof DataReader reader)) throw new DatashifterException("Class does not implement DataReader");
                reader.init(config != null ? config : new AdapterConfig());
                log.info("Initialized DataReader for adapter '{}'", adapterKeyOrId);
                return reader;
            } catch (DatashifterException de) { throw de; }
            catch (Exception e) { throw new DatashifterException("Failed to instantiate DataReader for '" + adapterKeyOrId + "': " + e.getMessage(), e); }
        });
    }

    public DataWriter getWriter(String adapterKeyOrId, AdapterConfig config) {
        String k = adapterKeyOrId + ":" + (config != null ? config.getProperties().hashCode() : 0);
        return writerCache.computeIfAbsent(k, key -> {
            LoadedAdapterClass loaded = classLoader.loadAdapterClass(adapterKeyOrId);
            try {
                Object inst = loaded.getClazz().getDeclaredConstructor().newInstance();
                if (!(inst instanceof DataWriter writer)) throw new DatashifterException("Class does not implement DataWriter");
                writer.init(config != null ? config : new AdapterConfig());
                log.info("Initialized DataWriter for adapter '{}'", adapterKeyOrId);
                return writer;
            } catch (DatashifterException de) { throw de; }
            catch (Exception e) { throw new DatashifterException("Failed to instantiate DataWriter for '" + adapterKeyOrId + "': " + e.getMessage(), e); }
        });
    }

    public boolean isAdapterInstalled(String adapterKeyOrId) {
        return classLoader.isAdapterInstalled(adapterKeyOrId);
    }

    public void close(AutoCloseable adapter) {
        if (adapter != null) {
            try { adapter.close(); } catch (Exception e) {
                log.warn("Error closing adapter {}: {}", adapter.getClass().getSimpleName(), e.getMessage());
            }
        }
    }

    public AdapterConfig parseConfig(String configJson) {
        if (configJson == null || configJson.isBlank()) return new AdapterConfig();
        try {
            Map<String, Object> props = objectMapper.readValue(configJson, Map.class);
            return new AdapterConfig(props);
        } catch (Exception e) {
            log.warn("Could not parse adapter config JSON: {}. Using empty config.", e.getMessage());
            return new AdapterConfig();
        }
    }

    public void clearCache() {
        classLoader.clearCache();
        writerCache.values().forEach(this::close);
        writerCache.clear();
        readerCache.values().forEach(this::close);
        readerCache.clear();
    }
}
