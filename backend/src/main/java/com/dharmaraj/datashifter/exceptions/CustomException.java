package com.dharmaraj.datashifter.exceptions;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * Base exception carrying HTTP status for API error responses.
 */
@Getter
public class CustomException extends RuntimeException {

    private final String message;

    private final HttpStatus status;

    public CustomException(String message, HttpStatus status) {
        super(message);
        this.message = message;
        this.status = status;
    }
}
