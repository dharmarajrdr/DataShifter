package com.datashifter.connector.spi.adapters.postgres.cdc;

import com.datashifter.common.cdc.CdcPosition;
import lombok.extern.slf4j.Slf4j;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Tracks and orders PostgreSQL Write-Ahead Log (WAL) segment files in a directory.
 * Coordinates sequential file traversal, starting LSN resolution, and segment rotation.
 */
@Slf4j
public class PostgresWalSequenceTracker {

    private final Path directoryPath;
    private final Pattern filePattern;

    private List<File> sortedWalFiles = new ArrayList<>();
    private int currentFileIndex = -1;
    private File currentFile;

    public PostgresWalSequenceTracker(String directoryPathStr, String filePatternStr) {
        this.directoryPath = Paths.get(directoryPathStr);
        String regex = (filePatternStr != null && !filePatternStr.isBlank() && !filePatternStr.equals(".*"))
                ? filePatternStr
                : PostgresWalConstants.DEFAULT_WAL_FILE_PATTERN;
        this.filePattern = Pattern.compile(regex, Pattern.CASE_INSENSITIVE);
    }

    /**
     * Scans the directory, finds all matching WAL segment files, and sorts them chronologically by LSN.
     */
    public synchronized List<File> refreshFiles() throws IOException {
        if (!Files.exists(directoryPath) || !Files.isDirectory(directoryPath)) {
            throw new IOException("PostgreSQL WAL directory does not exist or is not a directory: " + directoryPath);
        }

        try (var stream = Files.list(directoryPath)) {
            List<File> files = stream
                    .filter(Files::isRegularFile)
                    .map(Path::toFile)
                    .filter(this::matchesPattern)
                    .sorted(Comparator.comparingLong(f -> PostgresWalConstants.walFileNameToLsn(f.getName())))
                    .collect(Collectors.toList());

            this.sortedWalFiles = files;
            return Collections.unmodifiableList(sortedWalFiles);
        }
    }

    /**
     * Resolves and positions the tracker at the file matching the starting position.
     */
    public synchronized File resolveStartingFile(CdcPosition startingPosition) throws IOException {
        refreshFiles();

        if (sortedWalFiles.isEmpty()) {
            log.warn("No PostgreSQL WAL files found in directory: {}", directoryPath);
            currentFileIndex = -1;
            currentFile = null;
            return null;
        }

        // 1. Match by explicit source file name if provided
        if (startingPosition != null && startingPosition.getSourceFile() != null && !startingPosition.getSourceFile().isBlank()) {
            String targetFileName = Paths.get(startingPosition.getSourceFile()).getFileName().toString();
            for (int i = 0; i < sortedWalFiles.size(); i++) {
                if (sortedWalFiles.get(i).getName().equalsIgnoreCase(targetFileName)) {
                    currentFileIndex = i;
                    currentFile = sortedWalFiles.get(i);
                    log.info("Resolved starting WAL file by filename match: {} (index {})", currentFile.getName(), currentFileIndex);
                    return currentFile;
                }
            }
        }

        // 2. Match by starting LSN (find segment containing target LSN)
        if (startingPosition != null) {
            long targetLsn = 0L;
            if (startingPosition.getLsn() != null && startingPosition.getLsn() > 0) {
                targetLsn = startingPosition.getLsn();
            } else if (startingPosition.getToken() != null && !startingPosition.getToken().isBlank()) {
                targetLsn = PostgresWalConstants.parseLsn(startingPosition.getToken());
            }

            if (targetLsn > 0) {
                for (int i = 0; i < sortedWalFiles.size(); i++) {
                    File file = sortedWalFiles.get(i);
                    long segStartLsn = PostgresWalConstants.walFileNameToLsn(file.getName());
                    long segEndLsn = segStartLsn + PostgresWalConstants.WAL_SEGMENT_SIZE;

                    if (targetLsn >= segStartLsn && targetLsn < segEndLsn) {
                        currentFileIndex = i;
                        currentFile = file;
                        log.info("Resolved starting WAL file by LSN {}: {} (index {})", targetLsn, currentFile.getName(), currentFileIndex);
                        return currentFile;
                    }
                }
            }
        }

        // 3. Default to the earliest available WAL segment
        currentFileIndex = 0;
        currentFile = sortedWalFiles.get(0);
        log.info("Defaulting to earliest available WAL file: {}", currentFile.getName());
        return currentFile;
    }

    /**
     * Advances to the next chronological WAL file in the sequence.
     */
    public synchronized File advanceToNextFile() throws IOException {
        refreshFiles();

        if (currentFileIndex + 1 < sortedWalFiles.size()) {
            currentFileIndex++;
            currentFile = sortedWalFiles.get(currentFileIndex);
            log.info("Advanced to next WAL file: {} (index {} of {})", currentFile.getName(), currentFileIndex + 1, sortedWalFiles.size());
            return currentFile;
        }

        return null;
    }

    private boolean matchesPattern(File file) {
        String name = file.getName();
        if (name.endsWith(".backup") || name.endsWith(".history") || name.equals("archive_status")) {
            return false;
        }
        return filePattern.matcher(name).find();
    }

    public synchronized File getCurrentFile() {
        return currentFile;
    }

    public synchronized int getCurrentFileIndex() {
        return currentFileIndex;
    }

    public synchronized List<File> getSortedWalFiles() {
        return Collections.unmodifiableList(sortedWalFiles);
    }
}
