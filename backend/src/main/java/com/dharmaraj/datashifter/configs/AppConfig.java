package com.dharmaraj.datashifter.configs;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * Enables configuration properties and async execution for migration jobs.
 */
@Configuration
@EnableAsync
@EnableConfigurationProperties(MigrationProperties.class)
public class AppConfig {
}

