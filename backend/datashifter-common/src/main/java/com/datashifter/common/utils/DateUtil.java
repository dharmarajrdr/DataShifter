package com.datashifter.common.utils;

public class DateUtil {

    /**
     * Convert milliseconds to a human-readable format (e.g., "11:23:45")
     * @param millis the duration in milliseconds
     * @return a human-readable string representing the duration
     */
    public static String toHumanReadable(long millis) {
        long seconds = millis / 1000;
        return String.format("%02d:%02d:%02d", seconds / 3600, (seconds % 3600) / 60, seconds % 60);
    }
}
