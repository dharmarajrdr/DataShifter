package com.datashifter.common.exceptions;

public class ConnectionException extends DatashifterException {
    public ConnectionException(String message) { super(message); }
    public ConnectionException(String message, Throwable cause) { super(message, cause); }
}
