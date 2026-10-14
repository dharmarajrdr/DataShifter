package com.datashifter.connector.spi.adapters.oracle.cdc;

import lombok.*;

import java.time.Instant;

/**
 * File-level header metadata for Oracle GoldenGate trail files.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString
public class OracleTrailHeader {

    /** Magic number identifying the trail format */
    private short magic;

    /** File sequence number (e.g., 1 for aa000001) */
    private int sequenceNumber;

    /** Creation timestamp */
    private Instant createdAt;

    /** Source database version / type */
    private String databaseVersion;

    /** Operating system / architecture identifier */
    private String osPlatform;

    /** File header length in bytes */
    private int headerLength;

    /** Is this trail file binary format or structured JSON? */
    @Builder.Default
    private boolean binaryFormat = true;
}
