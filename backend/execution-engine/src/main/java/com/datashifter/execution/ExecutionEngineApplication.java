package com.datashifter.execution;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.ComponentScan;

@SpringBootApplication
@EntityScan(basePackages = "com.datashifter.common.models")
@ComponentScan(basePackages = {"com.datashifter.execution", "com.datashifter.common.security", "com.datashifter.common.utils", "com.datashifter.connector"})
public class ExecutionEngineApplication {
    public static void main(String[] args) {
        SpringApplication.run(ExecutionEngineApplication.class, args);
    }
}
