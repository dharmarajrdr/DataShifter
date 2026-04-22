package com.datashifter.common.exceptions;

public class ResourceNotFoundException extends DatashifterException {
    public ResourceNotFoundException(String resource, String id) {
        super(String.format("%s not found with id: %s", resource, id));
    }
}
