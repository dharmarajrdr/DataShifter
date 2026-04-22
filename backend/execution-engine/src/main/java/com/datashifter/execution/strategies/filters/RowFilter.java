package com.datashifter.execution.strategies.filters;

import java.util.Map;

public interface RowFilter {
    boolean matches(Map<String, Object> record);
}
