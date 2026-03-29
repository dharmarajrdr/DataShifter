package com.dharmaraj.datashifter.exceptions;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
/**
 * Extend any exception class with this class to handle custom exceptions in the application.
 * This class will be used to handle exceptions in the GlobalExceptionHandler class.
 */
public class CustomException extends RuntimeException {

    private final String message;

    private final HttpStatus status;

    public CustomException(String message, HttpStatus status) {
        super(message);
        this.message = message;
        this.status = status;
    }
}
