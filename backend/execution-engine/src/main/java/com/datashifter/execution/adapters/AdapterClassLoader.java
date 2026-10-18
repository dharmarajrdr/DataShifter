package com.datashifter.execution.adapters;

import com.datashifter.common.exceptions.DatashifterException;
import com.datashifter.common.models.AdapterDefinition;
import com.datashifter.common.repositories.AdapterDefinitionRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URL;
import java.net.URLClassLoader;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Isolated dynamic ClassLoader for installed Adapter JARs (<= 100 lines).
 */
@Component
@Slf4j
public class AdapterClassLoader {
    private final Path storageRoot;
    private final AdapterDefinitionRepository definitionRepo;
    private final Map<String, LoadedAdapterClass> classCache = new ConcurrentHashMap<>();

    public AdapterClassLoader(
            @Value("${datashifter.adapters.storage.root:${datashifter.udf.storage.root:/var/lib/datashifter/udfs}/adapters}") String storageRootPath,
            AdapterDefinitionRepository definitionRepo) {
        this.storageRoot = Paths.get(storageRootPath).toAbsolutePath().normalize();
        this.definitionRepo = definitionRepo;
        log.info("Initialized AdapterClassLoader with storage root: {}", this.storageRoot);
    }

    public boolean isAdapterInstalled(String key) {
        if (key == null || key.isBlank()) return false;
        AdapterDefinition def = definitionRepo.findByAdapterKey(key).or(() -> definitionRepo.findById(key)).orElse(null);
        if (def != null && def.getStorageKey() != null && resolveJarPath(def.getStorageKey()).toFile().exists()) return true;
        for (AdapterDefinition d : definitionRepo.findAllByAdapterKey(key)) {
            if (d.getStorageKey() != null && resolveJarPath(d.getStorageKey()).toFile().exists()) return true;
        }
        return false;
    }

    public LoadedAdapterClass loadAdapterClass(String key) {
        return classCache.computeIfAbsent(key, this::loadFromStorageOrRepo);
    }

    private LoadedAdapterClass loadFromStorageOrRepo(String key) {
        AdapterDefinition def = definitionRepo.findByAdapterKey(key).or(() -> definitionRepo.findById(key)).orElse(null);
        if (def != null && def.getStorageKey() != null && !def.getStorageKey().isBlank()) {
            Path jar = resolveJarPath(def.getStorageKey());
            if (jar.toFile().exists()) return loadJar(def, jar);
        }
        for (AdapterDefinition d : definitionRepo.findAllByAdapterKey(key)) {
            if (d.getStorageKey() != null && !d.getStorageKey().isBlank()) {
                Path jar = resolveJarPath(d.getStorageKey());
                if (jar.toFile().exists()) return loadJar(d, jar);
            }
        }
        if (def != null && def.getClassName() != null) {
            try {
                Class<?> c = Class.forName(def.getClassName(), true, getClass().getClassLoader());
                return new LoadedAdapterClass(getClass().getClassLoader(), c);
            } catch (ClassNotFoundException e) {
                throw new DatashifterException("Adapter class not found: " + def.getClassName(), e);
            }
        }
        if (key.contains(".")) {
            try {
                Class<?> c = Class.forName(key, true, getClass().getClassLoader());
                return new LoadedAdapterClass(getClass().getClassLoader(), c);
            } catch (ClassNotFoundException ignored) {}
        }
        throw new DatashifterException("Adapter '" + key + "' could not be loaded. Please install from Marketplace.");
    }

    private LoadedAdapterClass loadJar(AdapterDefinition def, Path jar) {
        try {
            URLClassLoader cl = new URLClassLoader(new URL[]{jar.toUri().toURL()}, getClass().getClassLoader());
            return new LoadedAdapterClass(cl, cl.loadClass(def.getClassName()));
        } catch (Exception e) {
            throw new DatashifterException("Failed to load adapter class '" + def.getClassName() + "' from " + jar, e);
        }
    }

    public void clearCache() { classCache.clear(); }

    public Path resolveJarPath(String storageKey) {
        Path r = storageRoot.resolve(storageKey).normalize();
        if (r.toFile().exists()) return r;
        Path local = Paths.get("adapter-storage", storageKey);
        if (local.toFile().exists()) return local;
        Path tmp = Paths.get(System.getProperty("java.io.tmpdir"), "datashifter", "adapters", storageKey);
        return tmp.toFile().exists() ? tmp : r;
    }
}

