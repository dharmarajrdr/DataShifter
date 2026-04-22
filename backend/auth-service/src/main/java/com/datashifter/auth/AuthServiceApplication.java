package com.datashifter.auth;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.context.annotation.ComponentScan;

@SpringBootApplication
@EntityScan(basePackages = "com.datashifter.common.models")
@EnableJpaRepositories(basePackages = {"com.datashifter.auth.repositories", "com.datashifter.common.repositories"})
@ComponentScan(basePackages = {
    "com.datashifter.auth",
    "com.datashifter.common.utils",
    "com.datashifter.common.exceptions",
    "com.datashifter.common.services"
    // Do NOT add common.security — it brings SharedSecurityConfig
})
public class AuthServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(AuthServiceApplication.class, args);
    }
}