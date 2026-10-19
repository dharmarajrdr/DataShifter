package com.datashifter.common.utils;

import com.datashifter.common.dtos.ConnectionDtos.ColumnMetadata;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * SQL DDL Schema Parser extracting column metadata (<= 100 lines).
 */
public final class DdlSchemaParser {

    private static final List<String> MULTI_TYPES = List.of(
            "TIMESTAMP WITH TIME ZONE", "TIMESTAMP WITHOUT TIME ZONE",
            "TIME WITH TIME ZONE", "TIME WITHOUT TIME ZONE", "DOUBLE PRECISION"
    );
    private static final Pattern COL_PATTERN = Pattern.compile("^([`\"']?[\\w.-]+[`\"']?)\\s+(.+)$", Pattern.DOTALL);
    private static final Pattern TYPE_PATTERN = Pattern.compile("^([a-zA-Z0-9_]+(?:\\s*\\([^)]*\\))?)");
    private static final Pattern NOT_NULL_PATTERN = Pattern.compile("\\bNOT\\s+NULL\\b", Pattern.CASE_INSENSITIVE);
    private static final Pattern INLINE_PK_PATTERN = Pattern.compile("\\bPRIMARY\\s+KEY\\b", Pattern.CASE_INSENSITIVE);
    private static final Pattern TBL_PATTERN = Pattern.compile(
            "CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?([`\"']?[\\w.-]+[`\"']?)", Pattern.CASE_INSENSITIVE);

    private DdlSchemaParser() {}

    public static String parseTableName(String ddl) {
        if (ddl == null) return "";
        Matcher m = TBL_PATTERN.matcher(ddl);
        return m.find() ? m.group(1).replaceAll("[`\"']", "") : "";
    }

    public static List<ColumnMetadata> parseColumns(String ddl) {
        if (ddl == null || ddl.isBlank()) return Collections.emptyList();
        String body = DdlDefinitionSplitter.extractTableBody(ddl);
        if (body.isEmpty()) return Collections.emptyList();

        List<String> items = DdlDefinitionSplitter.splitDefinitions(body);
        Set<String> pkCols = DdlDefinitionSplitter.extractPrimaryKeyColumns(items);

        List<ColumnMetadata> cols = new ArrayList<>();
        for (String item : items) {
            ColumnMetadata col = parseColumn(item, pkCols);
            if (col != null) cols.add(col);
        }
        return cols;
    }

    private static ColumnMetadata parseColumn(String item, Set<String> pkCols) {
        if (DdlDefinitionSplitter.isTableConstraint(item)) return null;
        Matcher m = COL_PATTERN.matcher(item.trim());
        if (!m.find()) return null;

        String name = m.group(1).replaceAll("[`\"']", "");
        String rest = m.group(2).trim();

        String type = null;
        String restUpper = rest.toUpperCase(Locale.ROOT);
        for (String mt : MULTI_TYPES) {
            if (restUpper.startsWith(mt)) {
                type = mt;
                break;
            }
        }
        if (type == null) {
            Matcher tm = TYPE_PATTERN.matcher(rest);
            type = tm.find() ? tm.group(1).trim() : "VARCHAR";
        }

        boolean nullable = !NOT_NULL_PATTERN.matcher(rest).find();
        boolean primaryKey = INLINE_PK_PATTERN.matcher(rest).find()
                || pkCols.contains(name.toLowerCase(Locale.ROOT));

        return ColumnMetadata.builder()
                .columnName(name)
                .dataType(type)
                .nullable(nullable)
                .primaryKey(primaryKey)
                .build();
    }
}
