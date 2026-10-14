package com.datashifter.connector.cdc.segregation;

import com.datashifter.common.cdc.CdcEvent;
import com.datashifter.common.enums.CdcOperationType;
import com.datashifter.common.enums.FilterOperator;
import com.datashifter.common.enums.LogicalOperator;
import lombok.extern.slf4j.Slf4j;

import java.math.BigDecimal;
import java.util.*;

/**
 * Row-level filter evaluating user-defined criteria against CDC before/after row payloads.
 */
@Slf4j
public class CdcRowFilter {

    private final List<CdcRowFilterCriterion> criteria;

    public CdcRowFilter(List<CdcRowFilterCriterion> criteria) {
        this.criteria = criteria != null ? new ArrayList<>(criteria) : Collections.emptyList();
    }

    public static CdcRowFilter of(List<CdcRowFilterCriterion> criteria) {
        return new CdcRowFilter(criteria);
    }

    public static CdcRowFilter of(CdcRowFilterCriterion... criteria) {
        return new CdcRowFilter(criteria != null ? Arrays.asList(criteria) : Collections.emptyList());
    }

    public static CdcRowFilter allowAll() {
        return new CdcRowFilter(Collections.emptyList());
    }

    /**
     * Evaluates whether the given CDC event passes the row-level filter.
     *
     * @param event incoming CDC event
     * @return true if record matches and should be replicated, false if skipped
     */
    public boolean matches(CdcEvent event) {
        if (event == null || criteria.isEmpty()) {
            return true;
        }

        // Transaction markers pass automatically
        if (event.getOperationType() == CdcOperationType.COMMIT ||
                event.getOperationType() == CdcOperationType.BEGIN) {
            return true;
        }

        // Choose relevant column image: afterData for INSERT/UPDATE, beforeData for DELETE
        Map<String, Object> data = (event.getOperationType() == CdcOperationType.DELETE)
                ? (event.getBeforeData() != null && !event.getBeforeData().isEmpty() ? event.getBeforeData() : event.getAfterData())
                : (event.getAfterData() != null && !event.getAfterData().isEmpty() ? event.getAfterData() : event.getBeforeData());

        if (data == null) {
            return false;
        }

        return evaluateCriteria(data);
    }

    /**
     * Evaluates row data map against the chained criteria with AND/OR precedence.
     */
    public boolean evaluate(Map<String, Object> rowData) {
        if (rowData == null || criteria.isEmpty()) {
            return true;
        }
        return evaluateCriteria(rowData);
    }

    private boolean evaluateCriteria(Map<String, Object> data) {
        if (criteria.isEmpty()) return true;

        boolean currentResult = evaluateSingle(data, criteria.get(0));

        for (int i = 0; i < criteria.size() - 1; i++) {
            CdcRowFilterCriterion curr = criteria.get(i);
            CdcRowFilterCriterion next = criteria.get(i + 1);
            boolean nextResult = evaluateSingle(data, next);

            if (curr.getLogicalOperator() == LogicalOperator.OR) {
                currentResult = currentResult || nextResult;
            } else {
                currentResult = currentResult && nextResult;
            }
        }

        return currentResult;
    }

    private boolean evaluateSingle(Map<String, Object> data, CdcRowFilterCriterion criterion) {
        if (criterion == null || criterion.getColumnName() == null) {
            return true;
        }

        Object rawValue = findValueCaseInsensitive(data, criterion.getColumnName());
        FilterOperator op = criterion.getOperator();
        String expected = criterion.getValue();

        if (op == null) return true;

        return switch (op) {
            case EQUALS -> {
                if (rawValue == null) yield expected == null || "null".equalsIgnoreCase(expected);
                yield String.valueOf(rawValue).equalsIgnoreCase(expected);
            }
            case NOT_EQUALS -> {
                if (rawValue == null) yield expected != null && !"null".equalsIgnoreCase(expected);
                yield !String.valueOf(rawValue).equalsIgnoreCase(expected);
            }
            case IS_NULL -> rawValue == null;
            case NOT_NULL -> rawValue != null;
            case GREATER_THAN -> compareValues(rawValue, expected) > 0;
            case LESS_THAN -> compareValues(rawValue, expected) < 0;
            case GREATER_THAN_OR_EQUAL -> compareValues(rawValue, expected) >= 0;
            case LESS_THAN_OR_EQUAL -> compareValues(rawValue, expected) <= 0;
            case IN -> {
                if (rawValue == null || expected == null) yield false;
                Set<String> set = parseCommaSeparatedValues(expected);
                yield set.contains(String.valueOf(rawValue).toUpperCase(Locale.ROOT));
            }
            case NOT_IN -> {
                if (rawValue == null) yield true;
                if (expected == null) yield true;
                Set<String> set = parseCommaSeparatedValues(expected);
                yield !set.contains(String.valueOf(rawValue).toUpperCase(Locale.ROOT));
            }
            case LIKE -> {
                if (rawValue == null || expected == null) yield false;
                String regex = "(?i)" + expected
                        .replace("\\", "\\\\")
                        .replace(".", "\\.")
                        .replace("%", ".*")
                        .replace("_", ".");
                yield String.valueOf(rawValue).matches(regex);
            }
        };
    }

    private Object findValueCaseInsensitive(Map<String, Object> data, String columnName) {
        if (data.containsKey(columnName)) {
            return data.get(columnName);
        }
        for (Map.Entry<String, Object> entry : data.entrySet()) {
            if (entry.getKey().equalsIgnoreCase(columnName)) {
                return entry.getValue();
            }
        }
        return null;
    }

    private int compareValues(Object actual, String expectedStr) {
        if (actual == null && expectedStr == null) return 0;
        if (actual == null) return -1;
        if (expectedStr == null) return 1;

        try {
            BigDecimal actualNum = new BigDecimal(actual.toString().trim());
            BigDecimal expectedNum = new BigDecimal(expectedStr.trim());
            return actualNum.compareTo(expectedNum);
        } catch (NumberFormatException e) {
            return actual.toString().compareToIgnoreCase(expectedStr);
        }
    }

    private Set<String> parseCommaSeparatedValues(String value) {
        Set<String> result = new HashSet<>();
        for (String item : value.split(",")) {
            String trimmed = item.trim().toUpperCase(Locale.ROOT);
            if (!trimmed.isEmpty()) {
                result.add(trimmed);
            }
        }
        return result;
    }

    public boolean isEmpty() {
        return criteria.isEmpty();
    }
}
