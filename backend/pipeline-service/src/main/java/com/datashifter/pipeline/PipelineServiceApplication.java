package com.datashifter.pipeline;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.ComponentScan;

@SpringBootApplication
@ComponentScan(basePackages = {"com.datashifter.pipeline", "com.datashifter.common.security", "com.datashifter.common.utils", "com.datashifter.connector"})
@EntityScan(basePackages = "com.datashifter.common.models")
public class PipelineServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(PipelineServiceApplication.class, args);
    }
}
