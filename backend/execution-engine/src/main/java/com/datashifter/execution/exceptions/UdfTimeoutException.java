package com.datashifter.execution.exceptions;

public class UdfTimeoutException extends UdfExecutionException {
    public UdfTimeoutException(String message) {
        super(message);
    }

    public UdfTimeoutException(String message, Throwable cause) {
        super(message, cause);
    }
}
