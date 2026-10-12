package com.datashifter.pipeline.validation;

import java.util.List;

/**
 * Represents a single step in the sequential pipeline validation chain.
 * Steps are executed in ascending {@link #getOrder()} order. If a step returns
 * any validation errors, the chain short-circuits and returns those errors
 * immediately.
 */
public interface PipelineValidationStep {

    /**
     * Execution order of this validation step (lower values run first).
     */
    int getOrder();

    /**
     * Descriptive name of this validation step.
     */
    String getStepName();

    /**
     * Validates the pipeline using the shared {@link PipelineValidationContext}.
     *
     * @return list of validation error messages (empty if valid)
     */
    List<String> validate(PipelineValidationContext context);
}
