package com.datashifter.gateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;

@SpringBootApplication(
    exclude = { org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration.class },
    scanBasePackages = "com.datashifter.gateway"  // don't scan common.security (servlet-based)
)
@ComponentScan(basePackages = {"com.datashifter.gateway", "com.datashifter.common.security", "com.datashifter.common.utils", "com.datashifter.connector"})
public class GatewayServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(GatewayServiceApplication.class, args);
    }
}
