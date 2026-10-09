package com.datashifter.udf.services;

import com.datashifter.common.dtos.UdfDtos.UdfFunctionResponse;
import com.datashifter.common.dtos.UdfDtos.UdfResponse;
import com.datashifter.common.enums.UdfStatus;
import com.datashifter.common.exceptions.DatashifterException;
import com.datashifter.common.models.UdfDefinition;
import com.datashifter.common.models.UdfFunction;
import com.datashifter.common.security.UserContext;
import com.datashifter.common.repositories.UdfDefinitionRepository;
import com.datashifter.udf.storage.UdfArtifactStorage;
import com.datashifter.udf.validation.UdfArtifactValidator;
import com.datashifter.udf.validation.UdfFunctionDiscovery;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.Arrays;

import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class UdfRegistryService {

    private final UdfDefinitionRepository repository;
    private final UdfArtifactValidator validator;
    private final UdfFunctionDiscovery discovery;
    private final UdfArtifactStorage storage;
    private final JdbcTemplate jdbcTemplate;

    @Transactional
    public UdfResponse upload(String name, String description, MultipartFile file) {
        String organizationId = requireContext(UserContext.getCurrentOrgId(), "organization");
        String userId = requireContext(UserContext.getCurrentUserId(), "user");
        String normalizedName = name == null ? "" : name.trim();
        if (normalizedName.isBlank()) throw new DatashifterException("UDF name is required");
        if (normalizedName.length() > 120) throw new DatashifterException("UDF name is too long");
        if (repository.existsByOrganizationIdAndName(organizationId, normalizedName)) throw new DatashifterException("A UDF with this name already exists");

        validator.validate(file);
        List<UdfFunctionDiscovery.DiscoveredFunction> functions = discovery.discover(file);
        String storageKey = organizationId + "/" + UUID.randomUUID() + ".jar";
        UdfArtifactStorage.StoredArtifact artifact;
        try {
            artifact = storage.store(file, storageKey);
        } catch (IOException e) {
            log.error("Failed to store UDF artifact key {}: {}", storageKey, e.getMessage(), e);
            throw new DatashifterException("Could not store the UDF artifact: " + e.getMessage(), e);
        }

        UdfDefinition entity = UdfDefinition.builder()
                .organizationId(organizationId).createdByUserId(userId)
                .name(normalizedName).description(description == null ? null : description.trim())
                .version("1.0.0").status(UdfStatus.READY)
                .artifactName(file.getOriginalFilename()).storageKey(storageKey)
                .artifactSha256(artifact.sha256()).sizeBytes(artifact.sizeBytes())
                .validationMessage("JAR integrity validation passed")
                .build();
            functions.forEach(function -> entity.getFunctions().add(UdfFunction.builder()
                .udfDefinition(entity)
                .className(function.className()).methodName(function.methodName())
                .functionName(function.functionName()).description(function.description())
                .parameterTypes(String.join(",", function.parameterTypes()))
                .returnType(function.returnType()).staticMethod(function.staticMethod())
                .build()));
        try {
            return toResponse(repository.save(entity));
        } catch (RuntimeException e) {
            try { storage.delete(storageKey); } catch (IOException ignored) { }
            throw e;
        }
    }

    public record UdfReferenceCounts(long pipelineCount, long columnCount) {}

    private Map<String, UdfReferenceCounts> fetchReferenceCounts() {
        Map<String, UdfReferenceCounts> counts = new HashMap<>();
        try {
            String sql = """
                SELECT 
                    CASE 
                        WHEN t.arguments::text ~ '^[0-9]+$' THEN (encode(lo_get(t.arguments::oid), 'escape')::jsonb ->> 'udfId')
                        ELSE (t.arguments::text::jsonb ->> 'udfId')
                    END AS udf_id,
                    COUNT(DISTINCT pt.pipeline_id) AS pipeline_count,
                    COUNT(DISTINCT cm.id) AS column_count
                FROM transformations t
                LEFT JOIN column_mappings cm ON t.column_mapping_id = cm.id
                LEFT JOIN target_table_mappings ttm ON cm.target_table_mapping_id = ttm.id
                LEFT JOIN pipeline_tables pt ON ttm.pipeline_table_id = pt.id
                WHERE t.function_name = 'UDF' AND t.arguments IS NOT NULL
                GROUP BY 1
            """;
            jdbcTemplate.query(sql, rs -> {
                String udfId = rs.getString("udf_id");
                if (udfId != null && !udfId.isBlank()) {
                    counts.put(udfId, new UdfReferenceCounts(
                            rs.getLong("pipeline_count"),
                            rs.getLong("column_count")
                    ));
                }
            });
        } catch (Exception e) {
            log.warn("Could not query UDF reference counts: {}", e.getMessage());
        }
        return counts;
    }

    @Transactional(readOnly = true)
    public List<UdfResponse> getAll() {
        Map<String, UdfReferenceCounts> refCounts = fetchReferenceCounts();
        return repository.findByOrganizationIdOrderByUpdatedAtDesc(requireContext(UserContext.getCurrentOrgId(), "organization"))
                .stream().map(entity -> toResponse(entity, refCounts.get(entity.getId()))).toList();
    }

    @Transactional
    public void delete(String id) {
        String organizationId = requireContext(UserContext.getCurrentOrgId(), "organization");
        UdfDefinition entity = repository.findById(id).orElseThrow(() -> new DatashifterException("UDF not found"));
        if (!organizationId.equals(entity.getOrganizationId())) throw new DatashifterException("UDF not found or access denied");

        UdfReferenceCounts refCounts = fetchReferenceCounts().get(id);
        if (refCounts != null && (refCounts.pipelineCount() > 0 || refCounts.columnCount() > 0)) {
            throw new DatashifterException(String.format(
                    "Cannot delete UDF '%s' because it is referenced in %d pipeline(s) and %d column(s). Remove the transformations first.",
                    entity.getName(), refCounts.pipelineCount(), refCounts.columnCount()
            ));
        }

        try { storage.delete(entity.getStorageKey()); } catch (IOException e) { throw new DatashifterException("Could not delete the UDF artifact", e); }
        repository.delete(entity);
    }

    @Transactional(readOnly = true)
    public java.util.Map<String, Object> testFunction(String id, String className, String methodName, java.util.Map<String, Object> inputData, UdfExecutionService executionService) {
        String organizationId = requireContext(UserContext.getCurrentOrgId(), "organization");
        UdfDefinition entity = repository.findById(id).orElseThrow(() -> new DatashifterException("UDF not found"));
        if (!organizationId.equals(entity.getOrganizationId())) throw new DatashifterException("UDF not found or access denied");

        boolean functionExists = entity.getFunctions().stream()
                .anyMatch(f -> f.getClassName().equals(className) && f.getMethodName().equals(methodName));
        if (!functionExists) {
            throw new DatashifterException("Function not found in UDF");
        }

        return executionService.testFunction(entity.getStorageKey(), className, methodName, inputData);
    }

    private UdfResponse toResponse(UdfDefinition entity) {
        return toResponse(entity, null);
    }

    private UdfResponse toResponse(UdfDefinition entity, UdfReferenceCounts counts) {
        List<UdfFunctionResponse> functions = entity.getFunctions().stream().map(function -> UdfFunctionResponse.builder()
            .id(function.getId()).className(function.getClassName()).methodName(function.getMethodName())
            .functionName(function.getFunctionName()).description(function.getDescription())
            .parameterTypes(function.getParameterTypes().isBlank() ? List.of() : Arrays.asList(function.getParameterTypes().split(",")))
            .returnType(function.getReturnType()).staticMethod(function.isStaticMethod()).build()).toList();
        return UdfResponse.builder().id(entity.getId()).name(entity.getName()).description(entity.getDescription())
                .version(entity.getVersion()).status(entity.getStatus()).artifactName(entity.getArtifactName())
                .artifactSha256(entity.getArtifactSha256()).sizeBytes(entity.getSizeBytes())
            .validationMessage(entity.getValidationMessage()).createdAt(entity.getCreatedAt()).updatedAt(entity.getUpdatedAt())
            .functions(functions)
            .pipelineCount(counts != null ? counts.pipelineCount() : 0L)
            .columnCount(counts != null ? counts.columnCount() : 0L)
            .build();
    }

    private String requireContext(String value, String label) {
        if (value == null || value.isBlank()) throw new DatashifterException("Missing authenticated " + label + " context");
        return value;
    }
}