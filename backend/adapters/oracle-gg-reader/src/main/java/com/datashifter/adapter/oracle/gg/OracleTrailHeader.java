package com.datashifter.adapter.oracle.gg;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * Metadata header located at the beginning of an Oracle GoldenGate trail file.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OracleTrailHeader {

    private short magic;
    private short sequenceNumber;
    private Instant createdAt;
    private boolean binaryFormat;
    private int headerLength;
}
