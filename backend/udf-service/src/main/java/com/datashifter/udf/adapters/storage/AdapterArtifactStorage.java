package com.datashifter.udf.adapters.storage;

import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Path;

/**
 * Storage contract for persisting and retrieving compiled adapter JAR artifacts.
 */
public interface AdapterArtifactStorage {

    StoredArtifact store(MultipartFile file, String storageKey) throws IOException;

    StoredArtifact store(InputStream inputStream, String storageKey) throws IOException;

    void delete(String storageKey) throws IOException;

    Path getFilePath(String storageKey);

    boolean exists(String storageKey);

    record StoredArtifact(String sha256, long sizeBytes, Path localPath) {}
}
