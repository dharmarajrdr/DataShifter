package com.datashifter.ai;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.web.bind.annotation.RestController;

@SpringBootApplication
@ComponentScan(
        basePackages = {
                "com.datashifter.ai",
                "com.datashifter.common.security",
                "com.datashifter.common.utils",
                "com.datashifter.common.services",
                "com.datashifter.common.exceptions",
                "com.datashifter.connector.services",
                "com.datashifter.connector.factories",
                "com.datashifter.connector.spi",
                "com.datashifter.pipeline.services",
                "com.datashifter.pipeline.validation",
                "com.datashifter.monitor.services",
                "com.datashifter.udf.services",
                "com.datashifter.udf.storage",
                "com.datashifter.udf.validation"
        },
        excludeFilters = @ComponentScan.Filter(
                type = FilterType.ANNOTATION,
                classes = RestController.class
        )
)
@ComponentScan(basePackages = "com.datashifter.ai.controllers")
@EntityScan(basePackages = "com.datashifter.common.models")
@EnableJpaRepositories(basePackages = {
        "com.datashifter.common.repositories",
        "com.datashifter.connector.repositories",
        "com.datashifter.pipeline.repositories",
        "com.datashifter.monitor.repositories"
})
public class AiServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(AiServiceApplication.class, args);
    }
}
