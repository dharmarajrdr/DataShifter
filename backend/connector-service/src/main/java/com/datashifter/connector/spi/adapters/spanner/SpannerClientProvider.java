package com.datashifter.connector.spi.adapters.spanner;

import com.datashifter.common.exceptions.ConnectionException;
import com.datashifter.connector.spi.interfaces.ConnectionConfig;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.auth.oauth2.ServiceAccountCredentials;
import com.google.cloud.spanner.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import jakarta.annotation.PreDestroy;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Manages Google Cloud Spanner client instances.
 *
 * ConnectionConfig mapping:
 *   host         = "projects/{project}/instances/{instance}"
 *   databaseName = Spanner database name
 *   password     = service account JSON key (decrypted)
 *   username     = not used (service account email is inside the JSON key)
 *
 * Clients are cached by connectionId — creating a Spanner client is expensive.
 */
@Component
@Slf4j
public class SpannerClientProvider {

    /** Cache: connectionId → active Spanner instance */
    private final Map<String, SpannerHolder> clientCache = new ConcurrentHashMap<>();

    /**
     * Get or create a DatabaseClient for the given config.
     */
    public DatabaseClient getClient(ConnectionConfig config) {
        return clientCache.computeIfAbsent(config.getConnectionId(), id -> createHolder(config))
                .databaseClient();
    }

    /**
     * Parse instance path from host field.
     * Expected format: "projects/{project}/instances/{instance}"
     */
    public static InstanceInfo parseInstancePath(String host) {
        // Accept both "projects/X/instances/Y" and just "X/Y"
        String[] parts = host.split("/");
        if (parts.length >= 4 && "projects".equals(parts[0]) && "instances".equals(parts[2])) {
            return new InstanceInfo(parts[1], parts[3]);
        }
        if (parts.length == 2) {
            return new InstanceInfo(parts[0], parts[1]);
        }
        throw new ConnectionException("Invalid Spanner host format: " + host +
                ". Expected: projects/{project}/instances/{instance}");
    }

    @PreDestroy
    public void shutdown() {
        clientCache.values().forEach(holder -> {
            try {
                holder.spanner().close();
            } catch (Exception e) {
                log.warn("Error closing Spanner client: {}", e.getMessage());
            }
        });
        clientCache.clear();
    }

    /**
     * Close and remove a specific client (e.g., when connection config changes).
     */
    public void evict(String connectionId) {
        SpannerHolder holder = clientCache.remove(connectionId);
        if (holder != null) {
            try { holder.spanner().close(); } catch (Exception e) { /* ignore */ }
        }
    }

    // =========================================================================
    // PRIVATE
    // =========================================================================

    private SpannerHolder createHolder(ConnectionConfig config) {
        try {
            InstanceInfo info = parseInstancePath(config.getHost());
            SpannerOptions.Builder builder = SpannerOptions.newBuilder()
                    .setProjectId(info.projectId());

            // If password contains a service account JSON key, use it
            String jsonKey = config.getPassword();
            if (jsonKey != null && !jsonKey.isBlank() && jsonKey.trim().startsWith("{")) {
                GoogleCredentials credentials = ServiceAccountCredentials.fromStream(
                        new ByteArrayInputStream(jsonKey.getBytes(StandardCharsets.UTF_8)));
                builder.setCredentials(credentials);
            }
            // Otherwise, fall back to Application Default Credentials (ADC)
            // This works on GCE/GKE/Cloud Run with attached service accounts

            Spanner spanner = builder.build().getService();
            DatabaseId dbId = DatabaseId.of(info.projectId(), info.instanceId(), config.getDatabaseName());
            DatabaseClient client = spanner.getDatabaseClient(dbId);

            log.info("Spanner client created: project={}, instance={}, database={}",
                    info.projectId(), info.instanceId(), config.getDatabaseName());

            return new SpannerHolder(spanner, client);
        } catch (Exception e) {
            throw new ConnectionException("Failed to create Spanner client: " + e.getMessage(), e);
        }
    }

    record SpannerHolder(Spanner spanner, DatabaseClient databaseClient) {}
    public record InstanceInfo(String projectId, String instanceId) {}
}