package com.datashifter.execution.exceptions;

import com.datashifter.common.exceptions.DatashifterException;

public class UdfExecutionException extends DatashifterException {
    public UdfExecutionException(String message) {
        super(message);
    }

    public UdfExecutionException(String message, Throwable cause) {
        super(message, cause);
    }
}
