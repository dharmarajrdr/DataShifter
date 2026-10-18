package com.datashifter.adapter.filesystem.writer;

import com.datashifter.adapter.sdk.AdapterConfig;
import lombok.Builder;
import lombok.Getter;

/**
 * Parsed configuration for FileSystemWriter.
 */
@Getter
@Builder
public class FileSystemWriterConfig {

    private final String outputDirectory;
    private final String fileFormat;
    private final String fileNamePrefix;
    private final String partitionBy;
    private final int maxRecordsPerFile;
    private final boolean append;

    public static FileSystemWriterConfig from(AdapterConfig config) {
        String outDir = config.getString("outputDirectory", "./output");
        String format = config.getString("fileFormat", "jsonl").toLowerCase();
        String prefix = config.getString("fileNamePrefix", "data_");
        String partition = config.getString("partitionBy", "none").toLowerCase();
        int maxRecords = config.getInteger("maxRecordsPerFile", 10000);
        boolean append = config.getBoolean("append", true);

        return FileSystemWriterConfig.builder()
                .outputDirectory(outDir)
                .fileFormat(format)
                .fileNamePrefix(prefix)
                .partitionBy(partition)
                .maxRecordsPerFile(maxRecords)
                .append(append)
                .build();
    }
}
