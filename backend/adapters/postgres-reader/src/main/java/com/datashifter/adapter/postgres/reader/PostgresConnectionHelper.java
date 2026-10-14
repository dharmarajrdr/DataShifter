package com.datashifter.adapter.postgres.reader;

import com.datashifter.adapter.sdk.AdapterConfig;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import lombok.extern.slf4j.Slf4j;

import java.sql.Connection;
import java.sql.SQLException;

/**
 * Connection management helper for PostgreSQL Reader adapter.
 */
@Slf4j
public class PostgresConnectionHelper implements AutoCloseable {

    private HikariDataSource dataSource;

    public void init(AdapterConfig config) {
        String host = config.getString("host", "localhost");
        int port = config.getInteger("port", 5432);
        String dbName = config.getString("databaseName", "");
        String schema = config.getString("schemaName", "public");
        String user = config.getString("username", "");
        String pass = config.getString("password", "");
        int maxPoolSize = config.getInteger("maxPoolSize", 5);

        String jdbcUrl = String.format("jdbc:postgresql://%s:%d/%s?currentSchema=%s&ApplicationName=DataShifterReader",
                host, port, dbName, schema);

        HikariConfig hikariConfig = new HikariConfig();
        hikariConfig.setJdbcUrl(jdbcUrl);
        hikariConfig.setUsername(user);
        hikariConfig.setPassword(pass);
        hikariConfig.setDriverClassName("org.postgresql.Driver");
        hikariConfig.setMaximumPoolSize(maxPoolSize);
        hikariConfig.setMinimumIdle(1);
        hikariConfig.setIdleTimeout(300000);
        hikariConfig.setConnectionTimeout(30000);
        hikariConfig.setPoolName("PostgresReaderPool-" + dbName);

        this.dataSource = new HikariDataSource(hikariConfig);
    }

    public Connection getConnection() throws SQLException {
        if (dataSource == null) {
            throw new SQLException("PostgresConnectionHelper is not initialized");
        }
        return dataSource.getConnection();
    }

    @Override
    public void close() {
        if (dataSource != null && !dataSource.isClosed()) {
            dataSource.close();
            log.info("Closed PostgreSQL Reader connection pool");
        }
    }
}
