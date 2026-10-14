package com.datashifter.adapter.postgres.wal;

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

    private short magic;
    private short info;
    private int timelineId;
    private long pageAddressLsn;
    private int remLen;
    private int headerLength;
    private boolean binaryFormat;
    private Instant createdAt;

    public boolean isLongHeader() {
        return (info & PostgresWalConstants.XLP_LONG_HEADER) != 0;
    }
}
