package com.datashifter.execution.exceptions;

public class UdfSkipRowException extends UdfExecutionException {
    public UdfSkipRowException(String message) {
        super(message);
    }

    public UdfSkipRowException(String message, Throwable cause) {
        super(message, cause);
    }
}
