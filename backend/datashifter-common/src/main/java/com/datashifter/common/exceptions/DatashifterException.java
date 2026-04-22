package com.datashifter.common.exceptions;

public class DatashifterException extends RuntimeException {
    public DatashifterException(String message) { super(message); }
    public DatashifterException(String message, Throwable cause) { super(message, cause); }
}
