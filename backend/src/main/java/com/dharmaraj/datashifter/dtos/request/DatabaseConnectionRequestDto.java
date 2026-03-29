package com.dharmaraj.datashifter.dtos.request;

import com.dharmaraj.datashifter.enums.DatabaseType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * Request payload carrying one database endpoint configuration.
 */
@Data
public class DatabaseConnectionRequestDto {

    @NotNull(message = "databaseType is required")
    private DatabaseType databaseType;

    @NotBlank(message = "host is required")
    private String host;

    @NotNull(message = "port is required")
    @Min(value = 1, message = "port must be >= 1")
    @Max(value = 65535, message = "port must be <= 65535")
    private Integer port;

    @NotBlank(message = "database is required")
    private String database;

    @NotBlank(message = "username is required")
    private String username;

    @NotBlank(message = "password is required")
    private String password;
}

