package com.datashifter.execution.strategies.filters;

import com.datashifter.common.enums.FilterOperator;
import lombok.RequiredArgsConstructor;

import java.util.*;
import java.util.stream.Collectors;

@RequiredArgsConstructor
public class FilterChain {

    private final List<RowFilter> filters;

    public List<Map<String, Object>> apply(List<Map<String, Object>> records) {
        if (filters.isEmpty()) return records;
        return records.stream()
                .filter(r -> filters.stream().allMatch(f -> f.matches(r)))
                .collect(Collectors.toList());
    }

    /** Factory to build a filter from operator and config */
    public static RowFilter createFilter(String column, FilterOperator operator, String value) {
        return switch (operator) {
            case EQUALS -> record -> Objects.equals(String.valueOf(record.get(column)), value);
            case NOT_EQUALS -> record -> !Objects.equals(String.valueOf(record.get(column)), value);
            case NOT_NULL -> record -> record.get(column) != null;
            case IS_NULL -> record -> record.get(column) == null;
            case GREATER_THAN -> record -> compareNumeric(record.get(column), value) > 0;
            case LESS_THAN -> record -> compareNumeric(record.get(column), value) < 0;
            case GREATER_THAN_OR_EQUAL -> record -> compareNumeric(record.get(column), value) >= 0;
            case LESS_THAN_OR_EQUAL -> record -> compareNumeric(record.get(column), value) <= 0;
            case IN -> record -> {
                Set<String> vals = Set.of(value.split(","));
                return vals.contains(String.valueOf(record.get(column)));
            };
            case NOT_IN -> record -> {
                Set<String> vals = Set.of(value.split(","));
                return !vals.contains(String.valueOf(record.get(column)));
            };
            case LIKE -> record -> {
                Object v = record.get(column);
                if (v == null) return false;
                String pattern = value.replace("%", ".*").replace("_", ".");
                return v.toString().matches(pattern);
            };
        };
    }

    private static int compareNumeric(Object a, String b) {
        if (a == null) return -1;
        try {
            return Double.compare(Double.parseDouble(a.toString()), Double.parseDouble(b));
        } catch (NumberFormatException e) {
            return a.toString().compareTo(b);
        }
    }
}
