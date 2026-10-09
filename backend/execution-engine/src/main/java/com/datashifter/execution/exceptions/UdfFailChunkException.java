package com.datashifter.execution.exceptions;

public class UdfFailChunkException extends UdfExecutionException {
    public UdfFailChunkException(String message) {
        super(message);
    }

    public UdfFailChunkException(String message, Throwable cause) {
        super(message, cause);
    }
}
