package com.datashifter.connector.spi.adapters.oracle.cdc;

public final class OracleTrailConstants {

    private OracleTrailConstants() {}

    /** Magic bytes identifying binary GoldenGate trail file: 'G' 'G' (0x47, 0x47) */
    public static final short TRAIL_MAGIC_BINARY = 0x4747;

    /** Magic token header for GoldenGate Trail Files */
    public static final byte[] TRAIL_MAGIC_BYTES = new byte[] { 0x00, 0x47, 0x47, 0x00 };

    /** Operation Codes */
    public static final int OP_BEGIN = 0;
    public static final int OP_COMMIT = 1;
    public static final int OP_INSERT = 3;
    public static final int OP_UPDATE = 5;
    public static final int OP_DELETE = 15;
    public static final int OP_TRUNCATE = 20;

    /** Record Type Indicators */
    public static final char TYPE_INSERT = 'I';
    public static final char TYPE_UPDATE = 'U';
    public static final char TYPE_DELETE = 'D';
    public static final char TYPE_COMMIT = 'C';
    public static final char TYPE_BEGIN  = 'B';

    /** Default trail file prefix if not specified (e.g., aa000000) */
    public static final String DEFAULT_FILE_PREFIX = "aa";

    /** Default batch poll size */
    public static final int DEFAULT_BATCH_SIZE = 500;

    /** Default transaction buffer limit before streaming fallback (rows) */
    public static final int DEFAULT_MAX_TX_BUFFER_SIZE = 10_000;
}
