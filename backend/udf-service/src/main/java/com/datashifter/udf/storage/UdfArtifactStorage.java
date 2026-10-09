package com.datashifter.udf.storage;

import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

public interface UdfArtifactStorage {
    StoredArtifact store(MultipartFile file, String storageKey) throws IOException;
    void delete(String storageKey) throws IOException;
    java.nio.file.Path getFilePath(String storageKey);

    record StoredArtifact(String sha256, long sizeBytes) {}
}