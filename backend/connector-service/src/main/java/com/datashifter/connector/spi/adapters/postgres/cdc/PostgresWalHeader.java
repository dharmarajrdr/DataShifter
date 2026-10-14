package com.datashifter.connector.spi.adapters.postgres.cdc;

import lombok.*;

import java.time.Instant;

/**
 * Metadata extracted from a PostgreSQL WAL segment page header.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString
public class PostgresWalHeader {

    /** Magic number identifying the PostgreSQL WAL version */
    private short magic;

    /** Page flags (e.g. XLP_LONG_HEADER) */
    private short info;

    /** Timeline ID (usually 1 unless branch/failover occurred) */
    private int timelineId;

    /** Starting LSN address of this 8KB page */
    private long pageAddressLsn;

    /** Remaining length of record that began on previous page */
    private int remLen;

    /** Header length in bytes (24 for short, 40 for long) */
    private int headerLength;

    /** True if this is a binary WAL file, false if JSON/logical decoded file */
    private boolean binaryFormat;

    /** Creation timestamp */
    private Instant createdAt;

    public boolean isLongHeader() {
        return (info & PostgresWalConstants.XLP_LONG_HEADER) != 0;
    }
}
