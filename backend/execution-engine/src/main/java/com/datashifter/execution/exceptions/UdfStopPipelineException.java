package com.datashifter.execution.exceptions;

public class UdfStopPipelineException extends UdfExecutionException {
    public UdfStopPipelineException(String message) {
        super(message);
    }

    public UdfStopPipelineException(String message, Throwable cause) {
        super(message, cause);
    }
}
