package com.datashifter.adapter.filesystem.writer;

import com.datashifter.adapter.sdk.AdapterConfig;
import com.datashifter.adapter.sdk.DataRecord;
import com.datashifter.adapter.sdk.DataWriter;
import com.datashifter.adapter.sdk.WriteMode;
import com.datashifter.adapter.sdk.WriteResult;
import com.datashifter.adapter.sdk.annotations.AdapterConfigProperty;
import com.datashifter.adapter.sdk.annotations.AdapterMode;
import com.datashifter.adapter.sdk.annotations.AdapterType;
import com.datashifter.adapter.sdk.annotations.DataShifterAdapter;
import lombok.extern.slf4j.Slf4j;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;

/**
 * High-performance target writer for local and mounted filesystems (JSON, CSV, JSONL).
 */
@DataShifterAdapter(
        id = "filesystem-writer",
        name = "File System Writer",
        description = "High-performance target writer for local and mounted filesystems (JSON, CSV, JSONL)",
        type = AdapterType.WRITER,
        mode = AdapterMode.BOTH,
        category = "storage",
        version = "1.0.0"
)
@AdapterConfigProperty(name = "outputDirectory", label = "Output Directory", type = "string", description = "Base directory for output files", defaultValue = "./output")
@AdapterConfigProperty(name = "fileFormat", label = "File Format", type = "string", description = "Format of files: jsonl, json, or csv", defaultValue = "jsonl")
@AdapterConfigProperty(name = "fileNamePrefix", label = "File Name Prefix", type = "string", description = "Prefix for generated file names", defaultValue = "data_")
@AdapterConfigProperty(name = "partitionBy", label = "Partition Strategy", type = "string", description = "Partitioning strategy: none, date, or table", defaultValue = "none")
@AdapterConfigProperty(name = "append", label = "Append Mode", type = "boolean", description = "Append to existing file if present", defaultValue = "true")
@Slf4j
public class FileSystemWriter implements DataWriter {

    private FileSystemWriterConfig config;
    private FileRecordFormatter formatter;

    @Override
    public synchronized void init(AdapterConfig adapterConfig) throws Exception {
        this.config = FileSystemWriterConfig.from(adapterConfig);
        this.formatter = FileRecordFormatter.forFormat(config.getFileFormat());

        Path rootPath = Paths.get(config.getOutputDirectory());
        if (!Files.exists(rootPath)) {
            Files.createDirectories(rootPath);
            log.info("Created output directory: {}", rootPath.toAbsolutePath());
        }
    }

    @Override
    public WriteResult writeBatch(AdapterConfig adapterConfig,
                                  String targetTable,
                                  List<DataRecord> records,
                                  WriteMode writeMode,
                                  String primaryKeyColumn) throws Exception {
        if (records == null || records.isEmpty()) {
            return WriteResult.empty();
        }

        if (config == null) {
            init(adapterConfig);
        }

        try {
            Path targetFile = resolveTargetFilePath(targetTable);
            boolean isNewFile = !Files.exists(targetFile) || Files.size(targetFile) == 0;
            boolean includeHeader = isNewFile;

            String formattedContent = formatter.formatBatch(records, includeHeader);

            StandardOpenOption openOption = (config.isAppend() && !isNewFile)
                    ? StandardOpenOption.APPEND
                    : StandardOpenOption.TRUNCATE_EXISTING;

            Files.writeString(targetFile, formattedContent, StandardCharsets.UTF_8,
                    StandardOpenOption.CREATE, openOption);

            log.debug("Wrote {} records to file {}", records.size(), targetFile.toAbsolutePath());

            return WriteResult.builder()
                    .totalRecords(records.size())
                    .successCount(records.size())
                    .failureCount(0)
                    .failedRecords(Collections.emptyList())
                    .build();

        } catch (IOException e) {
            log.error("Failed to write batch to filesystem for table {}: {}", targetTable, e.getMessage(), e);
            return WriteResult.builder()
                    .totalRecords(records.size())
                    .successCount(0)
                    .failureCount(records.size())
                    .failedRecords(records.stream()
                            .map(r -> new WriteResult.FailedRecord(r, e.getMessage(), "FS_WRITE_ERROR"))
                            .toList())
                    .build();
        }
    }

    @Override
    public WriteResult applyBatch(AdapterConfig adapterConfig,
                                  String targetTable,
                                  List<DataRecord> records,
                                  String primaryKeyColumn) throws Exception {
        // In filesystem target, CDC mutations are persisted with _op metadata
        return writeBatch(adapterConfig, targetTable, records, WriteMode.UPSERT, primaryKeyColumn);
    }

    private Path resolveTargetFilePath(String targetTable) throws IOException {
        Path dir = Paths.get(config.getOutputDirectory());

        if ("table".equalsIgnoreCase(config.getPartitionBy())) {
            dir = dir.resolve(targetTable != null ? targetTable : "default");
        } else if ("date".equalsIgnoreCase(config.getPartitionBy())) {
            String dateFolder = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE);
            dir = dir.resolve(dateFolder);
        }

        if (!Files.exists(dir)) {
            Files.createDirectories(dir);
        }

        String tableNamePart = (targetTable != null && !targetTable.isBlank()) ? targetTable : "data";
        String fileName = config.getFileNamePrefix() + tableNamePart + formatter.getFileExtension();
        return dir.resolve(fileName);
    }

    @Override
    public void close() throws Exception {
        log.info("Closed FileSystemWriter");
    }
}
