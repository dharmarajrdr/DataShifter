package com.datashifter.connector;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.ComponentScan;

@SpringBootApplication
@EntityScan(basePackages = "com.datashifter.common.models")
@ComponentScan(basePackages = {"com.datashifter.connector", "com.datashifter.common.security", "com.datashifter.common.utils"})
public class ConnectorServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(ConnectorServiceApplication.class, args);
    }
}
