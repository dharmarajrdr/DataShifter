package com.datashifter.connector;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
@EntityScan(basePackages = "com.datashifter.common.models")
@ComponentScan(basePackages = {"com.datashifter.connector", "com.datashifter.common.security", "com.datashifter.common.utils", "com.datashifter.common.services", "com.datashifter.common.exceptions"})
@EnableJpaRepositories(basePackages = {"com.datashifter.connector.repositories", "com.datashifter.common.repositories"})
public class ConnectorServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(ConnectorServiceApplication.class, args);
    }
}