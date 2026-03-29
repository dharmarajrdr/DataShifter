package com.dharmaraj.datashifter.exceptions;

import org.springframework.http.HttpStatus;

public class IncompatibleDatatypeException extends CustomException {

    public IncompatibleDatatypeException(String sourceType, String targetType) {

        super(String.format("Incompatible data types: Cannot convert from '%s' to '%s'", sourceType, targetType), HttpStatus.BAD_REQUEST);
    }
}
