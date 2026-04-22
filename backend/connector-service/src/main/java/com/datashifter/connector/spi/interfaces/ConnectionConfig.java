package com.datashifter.connector.spi.interfaces;

import com.datashifter.common.enums.DatabaseType;
import lombok.*;

import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConnectionConfig {
    private String connectionId;
    private DatabaseType dbType;
    private String host;
    private Integer port;
    private String databaseName;
    private String schemaName;
    private String username;
    private String password;   // decrypted
    private Map<String, String> extraProperties;

    /** Max connections in the HikariCP pool for this connection. Default 10. */
    @Builder.Default
    private Integer maxPoolSize = 10;
}