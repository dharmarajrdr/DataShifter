package com.datashifter.common.enums;

public enum UdfFailurePolicy {
    SKIP_ROW,
    DEFAULT_VALUE,
    FAIL_CHUNK,
    STOP_PIPELINE
}
