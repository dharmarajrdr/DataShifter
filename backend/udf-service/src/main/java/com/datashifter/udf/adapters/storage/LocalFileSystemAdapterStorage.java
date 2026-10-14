package com.datashifter.udf.adapters.storage;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.security.DigestInputStream;
import java.security.MessageDigest;

/**
 * Local filesystem-backed persistent storage for adapter JAR artifacts.
 */
@Component
@Slf4j
public class LocalFileSystemAdapterStorage implements AdapterArtifactStorage {

    private final Path root;

    public LocalFileSystemAdapterStorage(
            @Value("${datashifter.adapters.storage.root:${datashifter.udf.storage.root}/adapters}") String rootPath) throws IOException {
        this.root = Paths.get(rootPath).toAbsolutePath().normalize();
        Files.createDirectories(this.root);
        log.info("Initialized Adapter Artifact Storage at: {}", this.root);
    }

    @Override
    public StoredArtifact store(MultipartFile file, String storageKey) throws IOException {
        try (InputStream in = file.getInputStream()) {
            return store(in, storageKey);
        }
    }

    @Override
    public StoredArtifact store(InputStream inputStream, String storageKey) throws IOException {
        Path destination = resolve(storageKey);
        if (destination.getParent() != null) {
            Files.createDirectories(destination.getParent());
        }

        Path temporary = Files.createTempFile(root, ".adapter-upload-", ".tmp");
        MessageDigest digest = sha256();
        long size = 0;

        try (InputStream buffered = new BufferedInputStream(inputStream);
             DigestInputStream digestStream = new DigestInputStream(buffered, digest)) {
            size = Files.copy(digestStream, temporary, StandardCopyOption.REPLACE_EXISTING);
            try {
                Files.move(temporary, destination, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
            } catch (AtomicMoveNotSupportedException e) {
                Files.move(temporary, destination, StandardCopyOption.REPLACE_EXISTING);
            }
        } finally {
            Files.deleteIfExists(temporary);
        }

        return new StoredArtifact(toHex(digest.digest()), size, destination);
    }

    @Override
    public void delete(String storageKey) throws IOException {
        Files.deleteIfExists(resolve(storageKey));
    }

    @Override
    public Path getFilePath(String storageKey) {
        return resolve(storageKey);
    }

    @Override
    public boolean exists(String storageKey) {
        return Files.exists(resolve(storageKey));
    }

    private Path resolve(String storageKey) {
        Path resolved = root.resolve(storageKey).normalize();
        if (!resolved.startsWith(root)) {
            throw new IllegalArgumentException("Invalid adapter storage key outside root directory");
        }
        return resolved;
    }

    private static MessageDigest sha256() {
        try {
            return MessageDigest.getInstance("SHA-256");
        } catch (Exception e) {
            throw new IllegalStateException("SHA-256 algorithm unavailable", e);
        }
    }

    private static String toHex(byte[] bytes) {
        StringBuilder result = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            result.append(String.format("%02x", b));
        }
        return result.toString();
    }
}
