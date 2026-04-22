package com.datashifter.common.exceptions;

import com.datashifter.common.enums.PipelineStatus;

public class InvalidStateException extends DatashifterException {
    public InvalidStateException(PipelineStatus current, PipelineStatus target) {
        super(String.format("Invalid state transition: %s → %s", current, target));
    }
}
