package com.datashifter.connector.cdc.segregation;

import lombok.extern.slf4j.Slf4j;

import java.util.*;

/**
 * High-speed table segregation filter.
 * Matches incoming CDC record table identifiers against user-configured tables
 * using pre-normalized, case-insensitive O(1) hash sets.
 * Supports:
 * - Simple table names: "EMPLOYEES"
 * - Schema-qualified names: "HR.EMPLOYEES"
 * - Case-insensitive matching
 * - Allow-all when no tables are specified
 */
@Slf4j
public class CdcTableFilter {

    private final boolean passAll;
    private final Set<String> normalizedFullNames = new HashSet<>();
    private final Set<String> normalizedSimpleNames = new HashSet<>();

    public CdcTableFilter(Collection<String> allowedTables) {
        if (allowedTables == null || allowedTables.isEmpty()) {
            this.passAll = true;
        } else {
            this.passAll = false;
            for (String t : allowedTables) {
                if (t == null || t.isBlank()) continue;
                String normalized = t.trim().toUpperCase(Locale.ROOT);
                normalizedFullNames.add(normalized);
                if (normalized.contains(".")) {
                    String[] parts = normalized.split("\\.", 2);
                    normalizedSimpleNames.add(parts[1]);
                } else {
                    normalizedSimpleNames.add(normalized);
                }
            }
        }
    }

    public static CdcTableFilter of(Collection<String> allowedTables) {
        return new CdcTableFilter(allowedTables);
    }

    public static CdcTableFilter of(String... allowedTables) {
        return new CdcTableFilter(allowedTables != null ? Arrays.asList(allowedTables) : Collections.emptyList());
    }

    public static CdcTableFilter allowAll() {
        return new CdcTableFilter(Collections.emptyList());
    }

    /**
     * Fast check whether a table should be processed based on schema and table name.
     */
    public boolean matches(String schema, String table) {
        if (passAll) return true;
        if (table == null || table.isBlank()) return false;

        String upperTable = table.trim().toUpperCase(Locale.ROOT);
        if (schema != null && !schema.isBlank()) {
            String full = schema.trim().toUpperCase(Locale.ROOT) + "." + upperTable;
            if (normalizedFullNames.contains(full)) return true;
        }
        return normalizedSimpleNames.contains(upperTable);
    }

    /**
     * Fast check whether a full table string ("SCHEMA.TABLE" or "TABLE") should be processed.
     */
    public boolean matches(String fullTableName) {
        if (passAll) return true;
        if (fullTableName == null || fullTableName.isBlank()) return false;

        String normalized = fullTableName.trim().toUpperCase(Locale.ROOT);
        if (normalizedFullNames.contains(normalized)) return true;
        if (normalized.contains(".")) {
            String[] parts = normalized.split("\\.", 2);
            return normalizedSimpleNames.contains(parts[1]);
        }
        return normalizedSimpleNames.contains(normalized);
    }

    public boolean isPassAll() {
        return passAll;
    }

    public Set<String> getNormalizedTables() {
        return Collections.unmodifiableSet(normalizedSimpleNames);
    }
}
