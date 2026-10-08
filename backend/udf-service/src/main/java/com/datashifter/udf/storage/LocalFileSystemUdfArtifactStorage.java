package com.datashifter.udf.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.*;
import java.security.DigestInputStream;
import java.security.MessageDigest;

@Component
public class LocalFileSystemUdfArtifactStorage implements UdfArtifactStorage {

    private final Path root;

    public LocalFileSystemUdfArtifactStorage(@Value("${datashifter.udf.storage.root}") String root) throws IOException {
        this.root = Paths.get(root).toAbsolutePath().normalize();
        Files.createDirectories(this.root);
    }

    @Override
    public StoredArtifact store(MultipartFile file, String storageKey) throws IOException {
        Path destination = resolve(storageKey);
        Files.createDirectories(destination.getParent());
        Path temporary = Files.createTempFile(root, ".udf-upload-", ".tmp");
        MessageDigest digest = sha256();
        long size = 0;
        try (InputStream input = new BufferedInputStream(file.getInputStream());
             DigestInputStream digestInput = new DigestInputStream(input, digest)) {
            size = Files.copy(digestInput, temporary, StandardCopyOption.REPLACE_EXISTING);
            try {
                Files.move(temporary, destination, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
            } catch (AtomicMoveNotSupportedException e) {
                Files.move(temporary, destination, StandardCopyOption.REPLACE_EXISTING);
            }
        } finally {
            Files.deleteIfExists(temporary);
        }
        return new StoredArtifact(toHex(digest.digest()), size);
    }

    @Override
    public void delete(String storageKey) throws IOException {
        Files.deleteIfExists(resolve(storageKey));
    }

    private Path resolve(String storageKey) {
        Path resolved = root.resolve(storageKey).normalize();
        if (!resolved.startsWith(root)) throw new IllegalArgumentException("Invalid UDF storage key");
        return resolved;
    }

    private static MessageDigest sha256() {
        try { return MessageDigest.getInstance("SHA-256"); }
        catch (Exception e) { throw new IllegalStateException("SHA-256 is unavailable", e); }
    }

    private static String toHex(byte[] bytes) {
        StringBuilder result = new StringBuilder(bytes.length * 2);
        for (byte value : bytes) result.append(String.format("%02x", value));
        return result.toString();
    }
}