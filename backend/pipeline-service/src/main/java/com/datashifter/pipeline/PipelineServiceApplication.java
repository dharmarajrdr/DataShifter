package com.datashifter.pipeline;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
@ComponentScan(basePackages = {"com.datashifter.pipeline", "com.datashifter.common.security", "com.datashifter.common.utils", "com.datashifter.common.services", "com.datashifter.connector"})
@EntityScan(basePackages = "com.datashifter.common.models")
@EnableJpaRepositories(basePackages = {"com.datashifter.pipeline.repositories", "com.datashifter.common.repositories"})
public class PipelineServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(PipelineServiceApplication.class, args);
    }
}