package com.datashifter.udf.adapters.storage;

import com.datashifter.common.exceptions.DatashifterException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.*;
import java.net.HttpURLConnection;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Resolves compiled adapter JAR artifacts from local paths or remote S3 registry (<= 100 lines).
 */
@Component
@Slf4j
public class AdapterArtifactResolver {

    @Value("${datashifter.adapters.staging.dir:}")
    private String stagingDir;

    @Value("${datashifter.adapters.registry.base-url:https://datashifter.s3.ap-south-1.amazonaws.com/adapters}")
    private String registryBaseUrl;

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

        String home = System.getProperty("user.home", "");
        String[] searchPaths = new String[]{
                home + "/Documents/.datashifter/adapters/" + adapterKey + ".jar",
                "/var/lib/datashifter/adapters/" + adapterKey + ".jar",
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

        ResolvedArtifact remote = fetchFromRemoteRegistry(adapterKey);
        if (remote != null) return remote;

        throw new DatashifterException("Adapter JAR artifact for '" + adapterKey + "' not found in local paths or remote S3 registry.");
    }

    private ResolvedArtifact fetchFromRemoteRegistry(String adapterKey) {
        if (registryBaseUrl == null || registryBaseUrl.isBlank()) return null;
        String url = registryBaseUrl.replaceAll("/+$", "") + "/" + adapterKey + ".jar";
        try {
            HttpURLConnection conn = (HttpURLConnection) URI.create(url).toURL().openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(20000);
            conn.setInstanceFollowRedirects(true);
            int code = conn.getResponseCode();
            if (code == 200) {
                log.info("Downloaded adapter JAR for '{}' from S3 registry: {}", adapterKey, url);
                return new ResolvedArtifact(conn.getInputStream(), adapterKey + ".jar");
            }
            log.warn("S3 registry returned HTTP {} for {}", code, url);
        } catch (Exception e) {
            log.warn("Failed to download adapter from S3 registry {}: {}", url, e.getMessage());
        }
        return null;
    }

    private ResolvedArtifact openPath(Path path, String fileName) {
        try {
            return new ResolvedArtifact(new FileInputStream(path.toFile()), fileName);
        } catch (FileNotFoundException e) {
            throw new DatashifterException("Failed to open adapter artifact: " + e.getMessage(), e);
        }
    }
}
