package com.datashifter.common.enums;

/**
 * Defines the action to take when a predecessor pipeline in a workflow fails.
 */
public enum WorkflowFailureAction {
    /** Proceed to execute the successor pipeline despite predecessor failure */
    CONTINUE_PIPELINE,
    /** Skip/stop the immediate successor pipeline */
    STOP_PIPELINE,
    /** Halt the entire workflow and mark it as ERRORED */
    STOP_WORKFLOW
}

