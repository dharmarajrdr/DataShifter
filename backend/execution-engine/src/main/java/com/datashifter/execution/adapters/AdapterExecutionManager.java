package com.datashifter.execution.adapters;

import com.datashifter.adapter.sdk.AdapterConfig;
import com.datashifter.adapter.sdk.DataReader;
import com.datashifter.adapter.sdk.DataWriter;
import com.datashifter.common.exceptions.DatashifterException;
import com.datashifter.common.models.AdapterDefinition;
import com.datashifter.common.repositories.AdapterDefinitionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Collections;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Manages loading, isolated instantiation, configuration, and caching
 * of DataShifter DataReader and DataWriter adapters at runtime.
 */
@Service
@Slf4j
public class AdapterExecutionManager {

    private final Path storageRoot;
    private final AdapterDefinitionRepository definitionRepo;
    private final ObjectMapper objectMapper;

    // Cache of loaded adapter classes: adapterKeyOrId -> LoadedAdapterClass
    private final Map<String, LoadedAdapterClass> classCache = new ConcurrentHashMap<>();

    private static final Map<String, String> BUILT_IN_CLASSES = Map.of(
            "oracle-reader", "com.datashifter.adapter.oracle.reader.OracleReader",
            "oracle-writer", "com.datashifter.adapter.oracle.writer.OracleWriter",
            "postgres-reader", "com.datashifter.adapter.postgres.reader.PostgresReader",
            "postgres-writer", "com.datashifter.adapter.postgres.writer.PostgresWriter",
            "oracle-gg-reader", "com.datashifter.adapter.oracle.gg.OracleGoldenGateReader",
            "postgres-wal-reader", "com.datashifter.adapter.postgres.wal.PostgresWalReader",
            "filesystem-writer", "com.datashifter.adapter.filesystem.writer.FileSystemWriter",
            "kafka-writer", "com.datashifter.adapter.kafka.writer.KafkaWriter"
    );

    public AdapterExecutionManager(
            @Value("${datashifter.adapters.storage.root:${datashifter.udf.storage.root:/var/lib/datashifter/udfs}/adapters}") String storageRootPath,
            AdapterDefinitionRepository definitionRepo,
            ObjectMapper objectMapper) {
        this.storageRoot = Paths.get(storageRootPath).toAbsolutePath().normalize();
        this.definitionRepo = definitionRepo;
        this.objectMapper = objectMapper;
        log.info("Initialized AdapterExecutionManager with storage root: {}", this.storageRoot);
    }

    /**
     * Resolves, instantiates, and initializes a DataReader adapter.
     */
    public DataReader getReader(String adapterKeyOrId, AdapterConfig config) {
        LoadedAdapterClass loaded = loadAdapterClass(adapterKeyOrId);
        try {
            Object instance = loaded.getClazz().getDeclaredConstructor().newInstance();
            if (!(instance instanceof DataReader reader)) {
                throw new DatashifterException("Class " + loaded.getClazz().getName() + " does not implement DataReader");
            }
            reader.init(config != null ? config : new AdapterConfig());
            log.info("Initialized DataReader for adapter '{}' ({})", adapterKeyOrId, loaded.getClazz().getName());
            return reader;
        } catch (DatashifterException de) {
            throw de;
        } catch (Exception e) {
            throw new DatashifterException("Failed to instantiate DataReader for adapter '" + adapterKeyOrId + "': " + e.getMessage(), e);
        }
    }

    /**
     * Resolves, instantiates, and initializes a DataWriter adapter.
     */
    public DataWriter getWriter(String adapterKeyOrId, AdapterConfig config) {
        LoadedAdapterClass loaded = loadAdapterClass(adapterKeyOrId);
        try {
            Object instance = loaded.getClazz().getDeclaredConstructor().newInstance();
            if (!(instance instanceof DataWriter writer)) {
                throw new DatashifterException("Class " + loaded.getClazz().getName() + " does not implement DataWriter");
            }
            writer.init(config != null ? config : new AdapterConfig());
            log.info("Initialized DataWriter for adapter '{}' ({})", adapterKeyOrId, loaded.getClazz().getName());
            return writer;
        } catch (DatashifterException de) {
            throw de;
        } catch (Exception e) {
            throw new DatashifterException("Failed to instantiate DataWriter for adapter '" + adapterKeyOrId + "': " + e.getMessage(), e);
        }
    }

    /**
     * Safely closes an adapter resource.
     */
    public void close(AutoCloseable adapter) {
        if (adapter != null) {
            try {
                adapter.close();
            } catch (Exception e) {
                log.warn("Error closing adapter {}: {}", adapter.getClass().getSimpleName(), e.getMessage());
            }
        }
    }

    /**
     * Parses a JSON configuration string into an AdapterConfig instance.
     */
    public AdapterConfig parseConfig(String configJson) {
        if (configJson == null || configJson.isBlank()) {
            return new AdapterConfig();
        }
        try {
            Map<String, Object> props = objectMapper.readValue(configJson, Map.class);
            return new AdapterConfig(props);
        } catch (Exception e) {
            log.warn("Could not parse adapter config JSON: {}. Using empty config.", e.getMessage());
            return new AdapterConfig();
        }
    }

    /**
     * Resolves the Class definition for the adapter, either from the classpath or from an isolated JAR classloader.
     */
    public LoadedAdapterClass loadAdapterClass(String adapterKeyOrId) {
        return classCache.computeIfAbsent(adapterKeyOrId, key -> {
            // 1. Check built-in class mapping on current classpath
            String builtInClassName = BUILT_IN_CLASSES.get(key);
            if (builtInClassName != null) {
                try {
                    Class<?> clazz = Class.forName(builtInClassName, true, getClass().getClassLoader());
                    return new LoadedAdapterClass(getClass().getClassLoader(), clazz);
                } catch (ClassNotFoundException ignored) {
                    log.debug("Built-in class {} not present on engine classpath; checking adapter artifact storage", builtInClassName);
                }
            }

            // 2. Lookup definition in database repository
            AdapterDefinition definition = definitionRepo.findByAdapterKey(key)
                    .or(() -> definitionRepo.findById(key))
                    .orElse(null);

            if (definition != null && definition.getStorageKey() != null && !definition.getStorageKey().isBlank()) {
                Path jarPath = resolveJarPath(definition.getStorageKey());
                if (jarPath.toFile().exists()) {
                    try {
                        URLClassLoader classLoader = new URLClassLoader(
                                new URL[]{jarPath.toUri().toURL()},
                                getClass().getClassLoader()
                        );
                        Class<?> clazz = classLoader.loadClass(definition.getClassName());
                        return new LoadedAdapterClass(classLoader, clazz);
                    } catch (Exception e) {
                        throw new DatashifterException("Failed to load adapter class '" + definition.getClassName() + "' from JAR: " + jarPath, e);
                    }
                }
            }

            // 3. Direct Class.forName fallback
            String targetClassName = (definition != null) ? definition.getClassName() : (builtInClassName != null ? builtInClassName : key);
            try {
                Class<?> clazz = Class.forName(targetClassName, true, getClass().getClassLoader());
                return new LoadedAdapterClass(getClass().getClassLoader(), clazz);
            } catch (ClassNotFoundException e) {
                throw new DatashifterException("Adapter '" + key + "' could not be loaded. Class not found: " + targetClassName, e);
            }
        });
    }

    public void clearCache() {
        classCache.clear();
    }

    private Path resolveJarPath(String storageKey) {
        Path resolved = storageRoot.resolve(storageKey).normalize();
        if (resolved.toFile().exists()) {
            return resolved;
        }

        // Development and fallback search paths
        Path localPath = Paths.get("adapter-storage", storageKey);
        if (localPath.toFile().exists()) {
            return localPath;
        }

        Path tmpPath = Paths.get(System.getProperty("java.io.tmpdir"), "datashifter", "adapters", storageKey);
        if (tmpPath.toFile().exists()) {
            return tmpPath;
        }

        return resolved;
    }

    @Getter
    public static class LoadedAdapterClass {
        private final ClassLoader classLoader;
        private final Class<?> clazz;

        public LoadedAdapterClass(ClassLoader classLoader, Class<?> clazz) {
            this.classLoader = classLoader;
            this.clazz = clazz;
        }
    }
}
