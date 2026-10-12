package com.datashifter.pipeline.validation.steps;

import com.datashifter.common.enums.TransformFunction;
import com.datashifter.common.models.ColumnMapping;
import com.datashifter.common.models.Pipeline;
import com.datashifter.common.models.PipelineTable;
import com.datashifter.common.models.TargetTableMapping;
import com.datashifter.common.models.Transformation;
import com.datashifter.common.models.UdfDefinition;
import com.datashifter.common.repositories.UdfDefinitionRepository;
import com.datashifter.common.security.UserContext;
import com.datashifter.pipeline.validation.PipelineValidationContext;
import com.datashifter.pipeline.validation.PipelineValidationStep;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Step 2 of Pipeline Validation (runs before Column Data Type Validation):
 * Validates that any column mapping using a UDF transformation references an
 * existing UDF (by udfName), class (by className), and method (by methodName).
 */
@Component
@Slf4j
public class UdfReferenceValidationStep implements PipelineValidationStep {

    private static final ObjectMapper JSON_MAPPER = new ObjectMapper();

    private final UdfDefinitionRepository udfDefinitionRepository;

    public UdfReferenceValidationStep() {
        this.udfDefinitionRepository = null;
    }

    @Autowired
    public UdfReferenceValidationStep(UdfDefinitionRepository udfDefinitionRepository) {
        this.udfDefinitionRepository = udfDefinitionRepository;
    }

    @Override
    public int getOrder() {
        return 2;
    }

    @Override
    public String getStepName() {
        return "UDF Reference Validation";
    }

    @Override
    public List<String> validate(PipelineValidationContext context) {
        List<String> errors = new ArrayList<>();
        Pipeline pipeline = context.getPipeline();

        if (pipeline == null || pipeline.getPipelineTables() == null || pipeline.getPipelineTables().isEmpty()) {
            return errors;
        }

        String orgId = resolveOrgId(pipeline);

        for (PipelineTable pt : pipeline.getPipelineTables()) {
            if (pt.getTargetTableMappings() == null) {
                continue;
            }

            for (TargetTableMapping ttm : pt.getTargetTableMappings()) {
                String targetTable = ttm.getTargetTable();
                if (targetTable == null || targetTable.isBlank() || ttm.getColumnMappings() == null) {
                    continue;
                }

                for (ColumnMapping cm : ttm.getColumnMappings()) {
                    if (cm.getTargetColumn() == null || cm.getTargetColumn().isBlank()
                            || cm.getTransformations() == null || cm.getTransformations().isEmpty()) {
                        continue;
                    }

                    String targetColName = cm.getTargetColumn().trim();
                    List<Transformation> orderedTransforms = cm.getTransformations().stream()
                            .sorted(Comparator.comparingInt(t -> t.getExecutionOrder() != null ? t.getExecutionOrder() : 0))
                            .toList();

                    for (Transformation tr : orderedTransforms) {
                        if (tr.getFunctionName() != TransformFunction.UDF) {
                            continue;
                        }

                        validateUdfTransformation(tr, targetTable, targetColName, orgId, errors);
                    }
                }
            }
        }

        return errors;
    }

    private void validateUdfTransformation(
            Transformation tr,
            String targetTable,
            String targetColName,
            String orgId,
            List<String> errors) {

        String rawArgs = tr.getArguments();
        if (rawArgs == null || rawArgs.isBlank()) {
            errors.add(String.format("%s: Column \"%s\" has a UDF transformation without configuration.",
                    targetTable, targetColName));
            return;
        }

        Map<String, Object> parsed;
        try {
            parsed = JSON_MAPPER.readValue(rawArgs.trim(), new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            errors.add(String.format("%s: Column \"%s\" has invalid UDF configuration JSON.",
                    targetTable, targetColName));
            return;
        }

        String udfName = stringVal(parsed.get("udfName"));
        String className = stringVal(parsed.get("className"));
        String methodName = stringVal(parsed.get("methodName"));

        if (udfDefinitionRepository == null) {
            return;
        }

        if (udfName.isEmpty()) {
            errors.add(String.format("%s: Column \"%s\" — UDF name is missing in UDF transformation configuration.",
                    targetTable, targetColName));
            return;
        }

        if (className.isEmpty()) {
            errors.add(String.format("%s: Column \"%s\" — Class name is missing for UDF '%s'.",
                    targetTable, targetColName, udfName));
            return;
        }

        if (methodName.isEmpty()) {
            errors.add(String.format("%s: Column \"%s\" — Method name is missing for UDF '%s' (%s).",
                    targetTable, targetColName, udfName, className));
            return;
        }

        Optional<UdfDefinition> udfOpt = Optional.empty();
        if (orgId != null && !orgId.isBlank()) {
            udfOpt = udfDefinitionRepository.findByOrganizationIdAndName(orgId, udfName);
        }
        if (udfOpt.isEmpty()) {
            udfOpt = udfDefinitionRepository.findFirstByNameOrderByUpdatedAtDesc(udfName);
        }

        if (udfOpt.isEmpty()) {
            errors.add(String.format("%s: Column \"%s\" — UDF '%s' does not exist.",
                    targetTable, targetColName, udfName));
            return;
        }

        UdfDefinition udfDef = udfOpt.get();
        if (udfDef.getFunctions() != null && !udfDef.getFunctions().isEmpty()) {
            boolean classExists = udfDef.getFunctions().stream()
                    .anyMatch(f -> className.equals(f.getClassName()));
            if (!classExists) {
                errors.add(String.format("%s: Column \"%s\" — Class '%s' does not exist in UDF '%s'.",
                        targetTable, targetColName, className, udfName));
                return;
            }

            var matchedFnOpt = udfDef.getFunctions().stream()
                    .filter(f -> className.equals(f.getClassName()) && methodName.equals(f.getMethodName()))
                    .findFirst();
            if (matchedFnOpt.isEmpty()) {
                errors.add(String.format("%s: Column \"%s\" — Method '%s' does not exist in class '%s' of UDF '%s'.",
                        targetTable, targetColName, methodName, className, udfName));
                return;
            }
            if (!matchedFnOpt.get().isStaticMethod()) {
                errors.add(String.format("%s: Column \"%s\" — Method '%s' in class '%s' of UDF '%s' must be 'public static'.",
                        targetTable, targetColName, methodName, className, udfName));
            }
        }
    }

    private String resolveOrgId(Pipeline pipeline) {
        try {
            String ctxOrgId = UserContext.getCurrentOrgId();
            if (ctxOrgId != null && !ctxOrgId.isBlank()) {
                return ctxOrgId;
            }
        } catch (Exception ignored) {
        }
        if (pipeline.getCreatedBy() != null && pipeline.getCreatedBy().getOrganization() != null) {
            return pipeline.getCreatedBy().getOrganization().getId();
        }
        return null;
    }

    private String stringVal(Object val) {
        return val == null ? "" : String.valueOf(val).trim();
    }
}

