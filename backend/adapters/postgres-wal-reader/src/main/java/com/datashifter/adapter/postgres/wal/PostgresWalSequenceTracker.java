package com.datashifter.adapter.postgres.wal;

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

    public synchronized File resolveStartingFile(String startingFileName, Long startingLsn) throws IOException {
        refreshFiles();

        if (sortedWalFiles.isEmpty()) {
            return null;
        }

        if (startingFileName != null && !startingFileName.isBlank()) {
            for (int i = 0; i < sortedWalFiles.size(); i++) {
                if (sortedWalFiles.get(i).getName().equalsIgnoreCase(startingFileName)) {
                    this.currentFileIndex = i;
                    this.currentFile = sortedWalFiles.get(i);
                    return this.currentFile;
                }
            }
        }

        if (startingLsn != null && startingLsn > 0) {
            for (int i = sortedWalFiles.size() - 1; i >= 0; i--) {
                File f = sortedWalFiles.get(i);
                long segLsn = PostgresWalConstants.walFileNameToLsn(f.getName());
                if (startingLsn >= segLsn && startingLsn < (segLsn + PostgresWalConstants.WAL_SEGMENT_SIZE)) {
                    this.currentFileIndex = i;
                    this.currentFile = f;
                    return this.currentFile;
                }
            }
        }

        this.currentFileIndex = 0;
        this.currentFile = sortedWalFiles.get(0);
        return this.currentFile;
    }

    public synchronized File advanceToNextFile() throws IOException {
        refreshFiles();

        if (currentFileIndex + 1 < sortedWalFiles.size()) {
            currentFileIndex++;
            currentFile = sortedWalFiles.get(currentFileIndex);
            log.info("Advanced to next PostgreSQL WAL segment: {}", currentFile.getName());
            return currentFile;
        }

        return null;
    }

    public int getCurrentFileIndex() {
        return currentFileIndex;
    }

    public File getCurrentFile() {
        return currentFile;
    }

    private boolean matchesPattern(File file) {
        String name = file.getName();
        if (name.startsWith(".")) return false;
        return filePattern.matcher(name).matches() || name.endsWith(".json");
    }
}
