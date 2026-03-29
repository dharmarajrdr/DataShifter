package com.dharmaraj.datashifter.configs;

import org.springframework.boot.context.properties.ConfigurationProperties;

import lombok.Data;

/**
 * Typed migration settings loaded from application properties.
 */
@Data
@ConfigurationProperties(prefix = "datashifter.migration")
public class MigrationProperties {

    private int defaultBatchSize = 1000;

    private int maxBatchSize = 10000;
}
