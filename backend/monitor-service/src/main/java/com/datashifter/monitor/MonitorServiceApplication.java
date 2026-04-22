package com.datashifter.monitor;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.ComponentScan;

@SpringBootApplication
@ComponentScan(basePackages = {
    "com.datashifter.monitor",
    "com.datashifter.common.security",
    "com.datashifter.common.utils",
    "com.datashifter.common.exceptions"
})
@EntityScan(basePackages = "com.datashifter.common.models")
public class MonitorServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(MonitorServiceApplication.class, args);
    }
}
