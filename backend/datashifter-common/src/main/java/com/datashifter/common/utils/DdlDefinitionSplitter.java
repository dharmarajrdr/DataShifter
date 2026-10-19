package com.datashifter.common.utils;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Splits and inspects DDL statement bodies (<= 100 lines).
 */
public final class DdlDefinitionSplitter {

    private static final Pattern PK_PATTERN = Pattern.compile(
            "(?:CONSTRAINT\\s+[`\"'\\w]+\\s+)?PRIMARY\\s+KEY\\s*\\(([^)]+)\\)",
            Pattern.CASE_INSENSITIVE);

    private DdlDefinitionSplitter() {}

    public static String extractTableBody(String ddl) {
        if (ddl == null) return "";
        int start = ddl.indexOf('(');
        int end = ddl.lastIndexOf(')');
        return (start >= 0 && end > start) ? ddl.substring(start + 1, end).trim() : "";
    }

    public static List<String> splitDefinitions(String body) {
        List<String> items = new ArrayList<>();
        if (body == null || body.isBlank()) return items;
        int depth = 0;
        boolean inSingle = false, inDouble = false;
        StringBuilder cur = new StringBuilder();
        for (int i = 0; i < body.length(); i++) {
            char c = body.charAt(i);
            if (c == '\'' && !inDouble) inSingle = !inSingle;
            else if (c == '"' && !inSingle) inDouble = !inDouble;
            else if (!inSingle && !inDouble) {
                if (c == '(') depth++;
                else if (c == ')') depth--;
                else if (c == ',' && depth == 0) {
                    if (!cur.toString().trim().isEmpty()) items.add(cur.toString().trim());
                    cur.setLength(0);
                    continue;
                }
            }
            cur.append(c);
        }
        if (!cur.toString().trim().isEmpty()) items.add(cur.toString().trim());
        return items;
    }

    public static boolean isTableConstraint(String item) {
        String u = item.trim().toUpperCase(Locale.ROOT);
        return u.startsWith("CONSTRAINT") || u.startsWith("PRIMARY KEY")
                || u.startsWith("UNIQUE") || u.startsWith("FOREIGN KEY")
                || u.startsWith("CHECK") || u.startsWith("KEY ") || u.startsWith("INDEX ");
    }

    public static Set<String> extractPrimaryKeyColumns(List<String> items) {
        Set<String> pks = new HashSet<>();
        for (String it : items) {
            Matcher m = PK_PATTERN.matcher(it.trim());
            if (m.find()) {
                for (String col : m.group(1).split(",")) {
                    pks.add(col.trim().replaceAll("[`\"']", "").toLowerCase(Locale.ROOT));
                }
            }
        }
        return pks;
    }
}
