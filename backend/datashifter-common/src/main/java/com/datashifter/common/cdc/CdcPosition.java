package com.datashifter.common.cdc;

import lombok.*;

import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;

/**
 * Universal position token in a Change Data Capture stream.
 * Encapsulates Oracle SCN / RBA offsets and Postgres LSN offsets.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString
public class CdcPosition implements Comparable<CdcPosition>, Serializable {

    private static final long serialVersionUID = 1L;

    /** Source file name (e.g., Oracle trail file 'aa000001' or Postgres WAL file) */
    private String sourceFile;

    /** Relative Byte Address (RBA) or byte offset within the source file */
    @Builder.Default
    private Long fileOffset = 0L;

    /** Oracle System Change Number (SCN) */
    private Long scn;

    /** Postgres Log Sequence Number (LSN) represented as numeric offset */
    private Long lsn;

    /** Formatted string representation (e.g. LSN '0/16B3748' or SCN string) */
    private String token;

    /** Sequence number within the same transaction or batch */
    @Builder.Default
    private Long sequenceNumber = 0L;

    /** Transaction ID (XID) */
    private String transactionId;

    /** Record or commit timestamp */
    private Instant timestamp;

    @Override
    public int compareTo(CdcPosition other) {
        if (other == null) return 1;

        // 1. Compare by SCN if both have it
        if (this.scn != null && other.scn != null) {
            int cmp = Long.compare(this.scn, other.scn);
            if (cmp != 0) return cmp;
        }

        // 2. Compare by LSN if both have it
        if (this.lsn != null && other.lsn != null) {
            int cmp = Long.compare(this.lsn, other.lsn);
            if (cmp != 0) return cmp;
        }

        // 3. Compare by source file name if both have it
        if (this.sourceFile != null && other.sourceFile != null) {
            int cmp = this.sourceFile.compareTo(other.sourceFile);
            if (cmp != 0) return cmp;
        }

        // 4. Compare by byte offset (RBA)
        if (this.fileOffset != null && other.fileOffset != null) {
            int cmp = Long.compare(this.fileOffset, other.fileOffset);
            if (cmp != 0) return cmp;
        }

        // 5. Compare by sub-sequence number
        long seq1 = this.sequenceNumber != null ? this.sequenceNumber : 0L;
        long seq2 = other.sequenceNumber != null ? other.sequenceNumber : 0L;
        return Long.compare(seq1, seq2);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        CdcPosition that = (CdcPosition) o;
        return Objects.equals(sourceFile, that.sourceFile) &&
               Objects.equals(fileOffset, that.fileOffset) &&
               Objects.equals(scn, that.scn) &&
               Objects.equals(lsn, that.lsn) &&
               Objects.equals(sequenceNumber, that.sequenceNumber);
    }

    @Override
    public int hashCode() {
        return Objects.hash(sourceFile, fileOffset, scn, lsn, sequenceNumber);
    }
}
