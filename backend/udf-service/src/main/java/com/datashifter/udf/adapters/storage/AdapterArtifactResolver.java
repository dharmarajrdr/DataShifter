package com.datashifter.udf.adapters.storage;

import com.datashifter.common.exceptions.DatashifterException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Resolves compiled adapter JAR artifacts from local directories or classpath.
 */
@Component
@Slf4j
public class AdapterArtifactResolver {

    @Value("${datashifter.adapters.staging.dir:}")
    private String stagingDir;

    public record ResolvedArtifact(InputStream inputStream, String fileName) implements AutoCloseable {
        @Override
        public void close() throws IOException {
            if (inputStream != null) inputStream.close();
        }
    }

    public ResolvedArtifact resolve(String adapterKey) {
        if (stagingDir != null && !stagingDir.isBlank()) {
            Path p = Paths.get(stagingDir, adapterKey + ".jar");
            if (Files.exists(p)) return openPath(p, adapterKey + ".jar");
        }

        String[] searchPaths = new String[]{
                "backend/adapters/" + adapterKey + "/target/" + adapterKey + "-0.1.0-SNAPSHOT.jar",
                "backend/adapters/" + adapterKey + "/target/" + adapterKey + ".jar",
                "adapters/" + adapterKey + "/target/" + adapterKey + "-0.1.0-SNAPSHOT.jar",
                "data/staged-adapters/" + adapterKey + ".jar",
                "data/adapters/" + adapterKey + ".jar"
        };

        for (String sp : searchPaths) {
            Path p = Paths.get(sp).toAbsolutePath().normalize();
            if (Files.exists(p)) {
                log.info("Resolved adapter JAR for '{}' at {}", adapterKey, p);
                return openPath(p, adapterKey + ".jar");
            }
        }

        InputStream resStream = getClass().getResourceAsStream("/bundled-adapters/" + adapterKey + ".jar");
        if (resStream == null) {
            resStream = getClass().getResourceAsStream("/bundled-adapters/" + adapterKey + "-0.1.0-SNAPSHOT.jar");
        }
        if (resStream != null) {
            log.info("Resolved adapter JAR for '{}' from bundled classpath resource", adapterKey);
            return new ResolvedArtifact(resStream, adapterKey + ".jar");
        }

        throw new DatashifterException("Adapter JAR artifact for '" + adapterKey + "' not found.");
    }

    private ResolvedArtifact openPath(Path path, String fileName) {
        try {
            return new ResolvedArtifact(new FileInputStream(path.toFile()), fileName);
        } catch (FileNotFoundException e) {
            throw new DatashifterException("Failed to open adapter artifact: " + e.getMessage(), e);
        }
    }
}
