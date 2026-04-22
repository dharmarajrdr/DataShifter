package com.datashifter.common.models;

import com.datashifter.common.enums.ConnectionStatus;
import com.datashifter.common.enums.DatabaseType;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "connections")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Connection extends BaseEntity {

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "db_type", nullable = false, length = 20)
    private DatabaseType dbType;

    @Column(name = "db_version", length = 30)
    private String dbVersion;

    @Column(nullable = false)
    private String host;

    private Integer port;

    @Column(name = "database_name")
    private String databaseName;

    @Column(name = "schema_name")
    private String schemaName;

    @Column(nullable = false)
    private String username;

    @Column(name = "encrypted_password", nullable = false, length = 512)
    private String encryptedPassword;

    @ManyToOne
    private AppUser createdBy;

    /** Extra JDBC/connection properties as JSON string */
    @Lob
    @Column(name = "extra_properties")
    private String extraProperties;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ConnectionStatus status = ConnectionStatus.TESTING;

    @Column(name = "table_count")
    @Builder.Default
    private Integer tableCount = 0;

    @Column(name = "last_tested_at")
    private Instant lastTestedAt;

    @Lob
    @Column(name = "last_error")
    private String lastError;
}
