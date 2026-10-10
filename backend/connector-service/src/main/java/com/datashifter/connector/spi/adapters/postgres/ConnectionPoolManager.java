package com.datashifter.connector.spi.adapters.postgres;

import com.datashifter.connector.spi.interfaces.ConnectionConfig;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import jakarta.annotation.PreDestroy;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Manages HikariCP connection pools per unique ConnectionConfig.
 *
 * Instead of creating a new JDBC connection per chunk (30-80ms each),
 * this pools connections and hands them out in < 1ms.
 *
 * Pool lifecycle:
 *   - Created lazily on first getConnection() for a config
 *   - Cached by connectionId
 *   - Destroyed on application shutdown or explicit evict
 *
 * Pool sizing:
 *   - Max 10 connections per pool (read + write parallelism)
 *   - Min idle 2 (avoid cold-start for the first few chunks)
 *   - Idle timeout 5 min (release unused connections)
 *   - Max lifetime 25 min (prevent stale connections)
 */
@Component
@Slf4j
public class ConnectionPoolManager {

    private final ConcurrentHashMap<String, HikariDataSource> pools = new ConcurrentHashMap<>();

    /**
     * Get a pooled connection for the given config with default pool size (10).
     */
    public Connection getConnection(ConnectionConfig config) throws SQLException {
        return getConnection(config, 10);
    }

    /**
     * Get a pooled connection with a specific max pool size.
     * Pool is created on first call and reused thereafter.
     * If the pool already exists with a different size, the existing pool is reused
     * (pool size is set at creation time and cannot be changed dynamically).
     */
    public Connection getConnection(ConnectionConfig config, int maxPoolSize) throws SQLException {
        String poolKey = buildPoolKey(config);
        HikariDataSource ds = pools.computeIfAbsent(poolKey, k -> createPool(config, maxPoolSize));
        return ds.getConnection();
    }

    /**
     * Evict a specific pool (e.g., when a connection is deleted/updated).
     */
    public void evict(String connectionId) {
        pools.entrySet().removeIf(entry -> {
            if (entry.getKey().startsWith(connectionId + ":")) {
                closePool(entry.getValue(), entry.getKey());
                return true;
            }
            return false;
        });
    }

    /**
     * Evict all pools (e.g., on test connection to force refresh).
     */
    public void evictAll() {
        pools.forEach((key, ds) -> closePool(ds, key));
        pools.clear();
    }

    @PreDestroy
    public void shutdown() {
        log.info("Shutting down {} connection pools", pools.size());
        pools.forEach((key, ds) -> closePool(ds, key));
        pools.clear();
    }

    // =========================================================================
    // PRIVATE
    // =========================================================================

    private HikariDataSource createPool(ConnectionConfig config, int maxPoolSize) {
        String url;
        if (config.getDbType() == com.datashifter.common.enums.DatabaseType.ORACLE) {
            url = String.format("jdbc:oracle:thin:@%s:%d/%s",
                    config.getHost(), config.getPort() != null ? config.getPort() : 1521, config.getDatabaseName());
        } else {
            url = String.format(
                    "jdbc:postgresql://%s:%d/%s?reWriteBatchedInserts=true&ApplicationName=DataShifter",
                    config.getHost(), config.getPort(), config.getDatabaseName());
        }

        HikariConfig hc = new HikariConfig();
        hc.setJdbcUrl(url);
        hc.setUsername(config.getUsername());
        hc.setPassword(config.getPassword());
        hc.setPoolName("ds-" + config.getConnectionId());

        // Pool sizing — tuned for migration workloads
        hc.setMaximumPoolSize(Math.max(1, Math.min(maxPoolSize, 50)));  // Clamp 1-50
        hc.setMinimumIdle(Math.min(2, maxPoolSize));                     // At least 1, at most 2
        hc.setIdleTimeout(300_000);      // 5 min idle before release
        hc.setMaxLifetime(1_500_000);    // 25 min max connection lifetime
        hc.setConnectionTimeout(10_000); // 10s to get a connection from pool

        // Performance settings
        if (config.getDbType() == com.datashifter.common.enums.DatabaseType.POSTGRESQL) {
            hc.addDataSourceProperty("prepStmtCacheSize", "250");
            hc.addDataSourceProperty("prepStmtCacheSqlLimit", "2048");
            hc.addDataSourceProperty("cachePrepStmts", "true");
            hc.addDataSourceProperty("useServerPrepStmts", "true");
        } else if (config.getDbType() == com.datashifter.common.enums.DatabaseType.ORACLE) {
            hc.addDataSourceProperty("oracle.jdbc.implicitStatementCacheSize", "50");
            hc.addDataSourceProperty("oracle.jdbc.defaultExecuteBatch", "1000");
        }

        log.info("Created connection pool [{}] for {}:{}/{} ({}, max={}, idle={})",
                hc.getPoolName(), config.getHost(), config.getPort(), config.getDatabaseName(),
                config.getDbType(), hc.getMaximumPoolSize(), hc.getMinimumIdle());

        return new HikariDataSource(hc);
    }

    private String buildPoolKey(ConnectionConfig config) {
        return config.getConnectionId() + ":" + config.getHost() + ":" +
                config.getPort() + ":" + config.getDatabaseName();
    }

    private void closePool(HikariDataSource ds, String key) {
        try {
            if (!ds.isClosed()) {
                ds.close();
                log.info("Closed connection pool [{}]", key);
            }
        } catch (Exception e) {
            log.warn("Error closing pool [{}]: {}", key, e.getMessage());
        }
    }
}