package com.datashifter.execution;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
@EntityScan(basePackages = "com.datashifter.common.models")
@ComponentScan(basePackages = {"com.datashifter.execution", "com.datashifter.common.security", "com.datashifter.common.utils", "com.datashifter.common.services", "com.datashifter.common.exceptions", "com.datashifter.connector"})
@EnableJpaRepositories(basePackages = {"com.datashifter.execution.repositories", "com.datashifter.common.repositories"})
public class ExecutionEngineApplication {
    public static void main(String[] args) {
        SpringApplication.run(ExecutionEngineApplication.class, args);
    }
}