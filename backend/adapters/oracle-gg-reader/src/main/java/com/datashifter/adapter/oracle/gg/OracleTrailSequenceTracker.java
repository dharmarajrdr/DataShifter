package com.datashifter.adapter.oracle.gg;

import lombok.extern.slf4j.Slf4j;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
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

    public synchronized File resolveStartingFile(String startingFileName) throws IOException {
        refreshFiles();

        if (sortedTrailFiles.isEmpty()) {
            return null;
        }

        if (startingFileName != null && !startingFileName.isBlank()) {
            for (int i = 0; i < sortedTrailFiles.size(); i++) {
                if (sortedTrailFiles.get(i).getName().equalsIgnoreCase(startingFileName)) {
                    this.currentFileIndex = i;
                    this.currentFile = sortedTrailFiles.get(i);
                    return this.currentFile;
                }
            }
        }

        this.currentFileIndex = 0;
        this.currentFile = sortedTrailFiles.get(0);
        return this.currentFile;
    }

    public synchronized File advanceToNextFile() throws IOException {
        refreshFiles();

        if (currentFileIndex + 1 < sortedTrailFiles.size()) {
            currentFileIndex++;
            currentFile = sortedTrailFiles.get(currentFileIndex);
            log.info("Advanced to next trail file in sequence: {}", currentFile.getName());
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
        if (filePattern == null) {
            return true;
        }
        String regex = filePattern.replace(".", "\\.").replace("*", ".*").replace("?", ".");
        return name.matches(regex);
    }

    private long extractSequenceNumber(File file) {
        String name = file.getName();
        Matcher matcher = TRAIL_FILE_NUMERIC_PATTERN.matcher(name);
        if (matcher.find()) {
            try {
                return Long.parseLong(matcher.group(2));
            } catch (NumberFormatException ignored) {}
        }
        return file.lastModified();
    }
}
