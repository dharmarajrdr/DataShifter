package com.datashifter.connector.spi.adapters.oracle.cdc;

import com.datashifter.common.cdc.CdcPosition;
import lombok.extern.slf4j.Slf4j;

import java.io.File;
import java.io.IOException;
import java.nio.file.*;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Tracks and orders Oracle GoldenGate trail files in a directory and coordinates
 * sequential file traversal, starting position resolution, and rollover handling.
 */
@Slf4j
public class OracleTrailSequenceTracker {

    private final Path directoryPath;
    private final String filePattern;
    private static final Pattern TRAIL_FILE_NUMERIC_PATTERN = Pattern.compile("^(.*?)([0-9]{4,10})(\\.[^.]+)?$");

    private List<File> sortedTrailFiles = new ArrayList<>();
    private int currentFileIndex = -1;
    private File currentFile;

    public OracleTrailSequenceTracker(String directoryPathStr, String filePattern) {
        this.directoryPath = Paths.get(directoryPathStr);
        this.filePattern = (filePattern != null && !filePattern.isBlank()) ? filePattern : null;
    }

    /**
     * Scans the directory, finds all matching trail files, and sorts them by sequence number.
     */
    public synchronized List<File> refreshFiles() throws IOException {
        if (!Files.exists(directoryPath) || !Files.isDirectory(directoryPath)) {
            throw new IOException("Trail directory does not exist or is not a directory: " + directoryPath);
        }

        try (var stream = Files.list(directoryPath)) {
            List<File> files = stream
                    .filter(Files::isRegularFile)
                    .map(Path::toFile)
                    .filter(this::matchesPattern)
                    .sorted(Comparator.comparingLong(this::extractSequenceNumber))
                    .collect(Collectors.toList());

            this.sortedTrailFiles = files;
            return Collections.unmodifiableList(sortedTrailFiles);
        }
    }

    /**
     * Resolves and positions the tracker at the file matching the starting position.
     */
    public synchronized File resolveStartingFile(CdcPosition startingPosition) throws IOException {
        refreshFiles();

        if (sortedTrailFiles.isEmpty()) {
            log.warn("No trail files found in directory: {}", directoryPath);
            currentFileIndex = -1;
            currentFile = null;
            return null;
        }

        if (startingPosition != null && startingPosition.getSourceFile() != null && !startingPosition.getSourceFile().isBlank()) {
            String targetFileName = Paths.get(startingPosition.getSourceFile()).getFileName().toString();
            for (int i = 0; i < sortedTrailFiles.size(); i++) {
                if (sortedTrailFiles.get(i).getName().equalsIgnoreCase(targetFileName)) {
                    currentFileIndex = i;
                    currentFile = sortedTrailFiles.get(i);
                    log.info("Starting from specified trail file: {} (index {})", currentFile.getName(), i);
                    return currentFile;
                }
            }
            log.warn("Specified trail file '{}' not found in directory. Falling back to lowest available sequence.", targetFileName);
        }

        // Default to the first available trail file in chronological sequence
        currentFileIndex = 0;
        currentFile = sortedTrailFiles.get(0);
        log.info("Starting from initial trail file: {}", currentFile.getName());
        return currentFile;
    }

    /**
     * Advances to the next sequence trail file if available.
     *
     * @return next file if available, or null if currently at the latest file
     */
    public synchronized File advanceToNextFile() throws IOException {
        refreshFiles();

        if (currentFileIndex + 1 < sortedTrailFiles.size()) {
            currentFileIndex++;
            currentFile = sortedTrailFiles.get(currentFileIndex);
            log.info("Rolled over to next trail file: {} (index {})", currentFile.getName(), currentFileIndex);
            return currentFile;
        }

        return null;
    }

    public synchronized File getCurrentFile() {
        return currentFile;
    }

    public synchronized int getCurrentFileIndex() {
        return currentFileIndex;
    }

    public synchronized long extractSequenceNumber(File file) {
        if (file == null) return -1L;
        String name = file.getName();
        Matcher matcher = TRAIL_FILE_NUMERIC_PATTERN.matcher(name);
        if (matcher.matches()) {
            try {
                return Long.parseLong(matcher.group(2));
            } catch (NumberFormatException ignored) {}
        }
        return file.lastModified();
    }

    private boolean matchesPattern(File file) {
        String name = file.getName();
        if (name.startsWith(".")) return false; // Ignore hidden files

        if (filePattern != null) {
            String regex = filePattern
                    .replace(".", "\\.")
                    .replace("*", ".*")
                    .replace("?", ".");
            return name.matches(regex);
        }

        // Default OGG trail pattern: 2 alpha chars + numbers e.g. aa000000, or ending in .trail / .dat
        return TRAIL_FILE_NUMERIC_PATTERN.matcher(name).matches()
                || name.toLowerCase().endsWith(".trail")
                || name.toLowerCase().endsWith(".dat")
                || name.toLowerCase().endsWith(".json");
    }
}
