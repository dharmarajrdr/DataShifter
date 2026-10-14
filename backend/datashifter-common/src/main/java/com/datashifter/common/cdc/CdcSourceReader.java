package com.datashifter.common.cdc;

import com.datashifter.common.enums.DatabaseType;

import java.time.Duration;
import java.util.List;

/**
 * Service Provider Interface (SPI) for reading Change Data Capture streams.
 * Implementations handle engine-specific log formats:
 *   - OracleTrailFileReader: parses Oracle GoldenGate trail files
 *   - PostgresWalReader: consumes PostgreSQL WAL logical decoding stream
 *   - RemoteAgentReader: streams CDC events from a remote DataShifter Edge Agent
 */
public interface CdcSourceReader extends AutoCloseable {

    /** Database type this reader handles (ORACLE, POSTGRESQL, etc.) */
    DatabaseType getSupportedType();

    /**
     * Initializes and opens the log reader with the specified configuration.
     *
     * @param config the reader configuration including directory, pattern, and starting position
     * @throws Exception if opening log files or streams fails
     */
    void open(CdcReaderConfig config) throws Exception;

    /**
     * Polls for the next batch of CDC events up to maxEvents or until timeout expires.
     *
     * @param maxEvents maximum number of events to return
     * @param timeout   maximum wait duration
     * @return list of parsed CDC events, empty if none available
     * @throws Exception on unrecoverable read or parsing errors
     */
    List<CdcEvent> poll(int maxEvents, Duration timeout) throws Exception;

    /**
     * Commits the checkpoint in the reader's state tracker.
     *
     * @param position last successfully applied log position
     * @throws Exception if checkpoint state persistence fails
     */
    void commitCheckpoint(CdcPosition position) throws Exception;

    /**
     * Returns the current read position in the stream.
     */
    CdcPosition getCurrentPosition();

    /**
     * Checks if more events are immediately available or if stream is actively tailing.
     */
    boolean hasNext();

    /**
     * Closes underlying file channels, sockets, or decoders.
     */
    @Override
    void close() throws Exception;
}
