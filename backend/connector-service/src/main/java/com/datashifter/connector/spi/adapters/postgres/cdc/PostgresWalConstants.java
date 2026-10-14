package com.datashifter.connector.spi.adapters.postgres.cdc;

/**
 * Constants and utility converters for PostgreSQL Write-Ahead Logging (WAL) internals,
 * LSN representations, segment naming, and resource manager identifiers.
 */
public final class PostgresWalConstants {

    private PostgresWalConstants() {}

    /** Standard PostgreSQL WAL segment file size: 16 MB */
    public static final int WAL_SEGMENT_SIZE = 16 * 1024 * 1024; // 16,777,216 bytes

    /** Standard PostgreSQL page size: 8 KB */
    public static final int XLOG_BLCKSZ = 8192; // 8,192 bytes

    /** WAL Page Magic numbers across common PostgreSQL versions (13, 14, 15, 16) */
    public static final short XLOG_PAGE_MAGIC_15 = (short) 0xD115;
    public static final short XLOG_PAGE_MAGIC_16 = (short) 0xD116;
    public static final short XLOG_PAGE_MAGIC_14 = (short) 0xD114;
    public static final short XLOG_PAGE_MAGIC_13 = (short) 0xD10D;

    /** Page Header Flags */
    public static final short XLP_FIRST_IS_CONTRECORD = 0x0001;
    public static final short XLP_LONG_HEADER         = 0x0002;
    public static final short XLP_BKP_REMOVABLE       = 0x0004;

    /** Page Header Lengths in bytes */
    public static final int XLOG_SHORT_PAGE_HEADER_SIZE = 24;
    public static final int XLOG_LONG_PAGE_HEADER_SIZE  = 40;

    /** Standard XLogRecord Header size: 24 bytes (tot_len:4, xid:4, prev:8, info:1, rmid:1, padding:6) */
    public static final int XLOG_RECORD_HEADER_SIZE = 24;

    /** PostgreSQL Resource Manager IDs (RMs) */
    public static final int RM_XLOG_ID          = 0;
    public static final int RM_TRANSACTION_ID   = 1;
    public static final int RM_STORAGE_ID       = 2;
    public static final int RM_CLOG_ID          = 3;
    public static final int RM_DATABASE_ID      = 4;
    public static final int RM_TABLESPACE_ID    = 5;
    public static final int RM_MULTIXACT_ID     = 6;
    public static final int RM_RELMAP_ID        = 7;
    public static final int RM_STANDBY_ID       = 8;
    public static final int RM_HEAP2_ID         = 9;
    public static final int RM_HEAP_ID          = 10;
    public static final int RM_LOGICALMSG_ID    = 21;

    /** RM_TRANSACTION OpCodes */
    public static final int XLOG_XACT_COMMIT    = 0x00;
    public static final int XLOG_XACT_ABORT     = 0x20;

    /** RM_HEAP OpCodes */
    public static final int XLOG_HEAP_INSERT    = 0x00;
    public static final int XLOG_HEAP_DELETE    = 0x10;
    public static final int XLOG_HEAP_UPDATE    = 0x20;
    public static final int XLOG_HEAP_TRUNCATE  = 0x30;
    public static final int XLOG_HEAP_CONFIRM   = 0x40;
    public static final int XLOG_HEAP_LOCK      = 0x50;
    public static final int XLOG_HEAP_INPLACE   = 0x60;

    /** RM_HEAP2 OpCodes */
    public static final int XLOG_HEAP2_MULTI_INSERT = 0x60;

    /** Default WAL file match pattern: standard 24-character hexadecimal filename */
    public static final String DEFAULT_WAL_FILE_PATTERN = "^[0-9A-Fa-f]{24}$";

    /** Default polling batch size */
    public static final int DEFAULT_BATCH_SIZE = 500;

    /** Default in-memory transaction buffer limit */
    public static final int DEFAULT_MAX_TX_BUFFER_SIZE = 10_000;

    /**
     * Checks if a 2-byte short matches PostgreSQL page header magic.
     */
    public static boolean isWalPageMagic(short magic) {
        int unsigned = magic & 0xFFFF;
        return (unsigned >= 0xD100 && unsigned <= 0xD1FF);
    }

    /**
     * Parses a PostgreSQL LSN string (e.g. "0/3D7E5D8" or "0/16B3748") into a 64-bit unsigned long.
     */
    public static long parseLsn(String lsnStr) {
        if (lsnStr == null || lsnStr.isBlank()) {
            return 0L;
        }
        String cleaned = lsnStr.trim();
        int slashIdx = cleaned.indexOf('/');
        if (slashIdx >= 0) {
            String highHex = cleaned.substring(0, slashIdx);
            String lowHex = cleaned.substring(slashIdx + 1);
            long high = Long.parseUnsignedLong(highHex, 16);
            long low = Long.parseUnsignedLong(lowHex, 16);
            return (high << 32) | (low & 0xFFFFFFFFL);
        }
        try {
            return Long.parseUnsignedLong(cleaned, 16);
        } catch (NumberFormatException e) {
            return Long.parseLong(cleaned);
        }
    }

    /**
     * Formats a 64-bit LSN into standard PostgreSQL "X/Y" hex representation (e.g. "0/3D7E5D8").
     */
    public static String formatLsn(long lsn) {
        long high = lsn >>> 32;
        long low = lsn & 0xFFFFFFFFL;
        return String.format("%X/%X", high, low);
    }

    /**
     * Converts an LSN and Timeline ID to PostgreSQL 24-character WAL filename.
     * Identical to PostgreSQL's native pg_walfile_name(lsn).
     */
    public static String lsnToWalFileName(long lsn, int timelineId) {
        long segNo = lsn / WAL_SEGMENT_SIZE;
        long logId = segNo / 0x100000000L;
        long segId = segNo % 0x100000000L;
        return String.format("%08X%08X%08X", timelineId, logId, segId);
    }

    /**
     * Extracts starting LSN offset from a 24-character WAL filename.
     */
    public static long walFileNameToLsn(String fileName) {
        if (fileName == null || fileName.length() < 24) {
            return 0L;
        }
        try {
            long logId = Long.parseUnsignedLong(fileName.substring(8, 16), 16);
            long segId = Long.parseUnsignedLong(fileName.substring(16, 24), 16);
            long segNo = (logId * 0x100000000L) + segId;
            return segNo * WAL_SEGMENT_SIZE;
        } catch (Exception e) {
            return 0L;
        }
    }

    /**
     * Extracts timeline ID from a 24-character WAL filename.
     */
    public static int walFileNameToTimeline(String fileName) {
        if (fileName == null || fileName.length() < 8) {
            return 1;
        }
        try {
            return (int) Long.parseUnsignedLong(fileName.substring(0, 8), 16);
        } catch (Exception e) {
            return 1;
        }
    }
}
