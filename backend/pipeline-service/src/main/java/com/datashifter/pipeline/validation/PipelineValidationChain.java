package com.datashifter.pipeline.validation;

import java.util.Collections;
import java.util.Comparator;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.datashifter.pipeline.validation.datatype.DatabaseTypeDialectFactory;
import com.datashifter.pipeline.validation.datatype.TransformTypeResolver;
import com.datashifter.pipeline.validation.steps.ColumnDataTypeValidationStep;
import com.datashifter.pipeline.validation.steps.ColumnMappingValidationStep;

import lombok.extern.slf4j.Slf4j;

/**
 * Orchestrates the sequential pipeline validation steps in ascending order of
 * {@link PipelineValidationStep#getOrder()}.
 *
 * Short-circuits and returns immediately if any step produces validation errors
 * (e.g., if Step 1 Column Mapping Validation fails, Step 2 Data Type Validation
 * is not executed).
 */
@Component
@Slf4j
public class PipelineValidationChain {

    private final List<PipelineValidationStep> orderedSteps;

    public PipelineValidationChain() {
        this(List.of(
                new ColumnMappingValidationStep(),
                new ColumnDataTypeValidationStep(new DatabaseTypeDialectFactory(), new TransformTypeResolver())));
    }

    @Autowired
    public PipelineValidationChain(List<PipelineValidationStep> steps) {
        if (steps == null || steps.isEmpty()) {
            this.orderedSteps = List.of();
        } else {
            this.orderedSteps = steps.stream()
                    .sorted(Comparator.comparingInt(PipelineValidationStep::getOrder))
                    .toList();
        }
    }

    public List<String> execute(PipelineValidationContext context) {
        for (PipelineValidationStep step : orderedSteps) {
            List<String> errors = step.validate(context);
            if (errors != null && !errors.isEmpty()) {
                log.debug("Validation chain short-circuited at step '{}' (order={}) with {} error(s)",
                        step.getStepName(), step.getOrder(), errors.size());
                return errors;
            }
        }
        return Collections.emptyList();
    }
}
