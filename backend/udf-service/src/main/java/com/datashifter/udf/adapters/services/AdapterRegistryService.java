package com.datashifter.udf.adapters.services;

import com.datashifter.adapter.sdk.annotations.AdapterMode;
import com.datashifter.adapter.sdk.annotations.AdapterType;
import com.datashifter.common.dtos.AdapterDtos.AdapterResponse;
import com.datashifter.common.exceptions.DatashifterException;
import com.datashifter.common.models.AdapterDefinition;
import com.datashifter.common.models.OrgPurchasedAdapter;
import com.datashifter.common.repositories.AdapterDefinitionRepository;
import com.datashifter.common.repositories.OrgPurchasedAdapterRepository;
import com.datashifter.common.security.UserContext;
import com.datashifter.udf.adapters.discovery.AdapterDiscovery;
import com.datashifter.udf.adapters.storage.AdapterArtifactStorage;
import com.datashifter.udf.adapters.validation.AdapterArtifactValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Path;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service managing registry, catalog query, uploading, and lifecycle of DataShifter adapters.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AdapterRegistryService {

    private final AdapterDefinitionRepository repository;
    private final OrgPurchasedAdapterRepository purchasedRepo;
    private final AdapterArtifactValidator validator;
    private final AdapterDiscovery discovery;
    private final AdapterArtifactStorage storage;
    private final BuiltInAdapterSeeder seeder;
    private final JdbcTemplate jdbcTemplate;

    @Transactional
    public AdapterResponse uploadAdapter(String name, String description, MultipartFile file) {
        String organizationId = requireContext(UserContext.getCurrentOrgId(), "organization");
        String userId = requireContext(UserContext.getCurrentUserId(), "user");

        validator.validate(file);
        List<AdapterDiscovery.DiscoveredAdapter> discoveredList = discovery.discover(file);
        if (discoveredList.isEmpty()) {
            throw new DatashifterException("No @DataShifterAdapter annotations found in JAR");
        }

        AdapterDiscovery.DiscoveredAdapter primary = discoveredList.get(0);
        String adapterKey = primary.getAdapterKey();
        String displayName = (name != null && !name.isBlank()) ? name.trim() : primary.getName();

        Optional<AdapterDefinition> existing = repository.findByOrganizationIdAndAdapterKey(organizationId, adapterKey);
        String oldStorageKey = existing.map(AdapterDefinition::getStorageKey).orElse(null);

        String storageKey = organizationId + "/adapters/" + UUID.randomUUID() + "-" + file.getOriginalFilename();
        AdapterArtifactStorage.StoredArtifact stored;
        try {
            stored = storage.store(file, storageKey);
        } catch (IOException e) {
            log.error("Failed to persist adapter JAR {}: {}", storageKey, e.getMessage(), e);
            throw new DatashifterException("Failed to store adapter artifact: " + e.getMessage(), e);
        }

        AdapterDefinition entity = existing.orElseGet(() -> AdapterDefinition.builder()
                .organizationId(organizationId)
                .createdByUserId(userId)
                .adapterKey(adapterKey)
                .build());

        entity.setName(displayName);
        entity.setDescription((description != null && !description.isBlank()) ? description.trim() : primary.getDescription());
        entity.setAdapterType(primary.getAdapterType());
        entity.setSupportedMode(primary.getSupportedMode());
        entity.setCategory(primary.getCategory());
        entity.setVersion(primary.getVersion());
        entity.setStatus("READY");
        entity.setClassName(primary.getClassName());
        entity.setStorageKey(storageKey);
        entity.setArtifactName(file.getOriginalFilename());
        entity.setArtifactSha256(stored.sha256());
        entity.setSizeBytes(stored.sizeBytes());
        entity.setConfigSchema(primary.getConfigSchema());
        entity.setIsOfficial(false);

        try {
            AdapterDefinition saved = repository.save(entity);
            if (oldStorageKey != null && !oldStorageKey.equals(storageKey)) {
                try { storage.delete(oldStorageKey); } catch (IOException ignored) {}
            }
            log.info("Registered private custom adapter '{}' ({}) for org {}", displayName, adapterKey, organizationId);
            return toResponse(saved, true);
        } catch (RuntimeException e) {
            try {
                storage.delete(storageKey);
            } catch (IOException ignored) {}
            throw e;
        }
    }

    @Transactional(readOnly = true)
    public List<AdapterResponse> getAllAvailable(AdapterType type, AdapterMode mode, String category) {
        String orgId = UserContext.getCurrentOrgId();
        if (orgId == null || orgId.isBlank()) {
            return List.of();
        }

        List<AdapterDefinition> all = repository.findAllAvailableForOrg(orgId);
        Set<String> purchasedKeys = new HashSet<>();
        List<OrgPurchasedAdapter> purchases = purchasedRepo.findByOrganizationIdAndStatus(orgId, "ACTIVE");
        purchasedKeys.addAll(purchases.stream()
                .filter(p -> p.getMarketplaceItem() != null)
                .map(p -> p.getMarketplaceItem().getAdapterKey())
                .collect(Collectors.toSet()));

        Map<String, AdapterDefinition> byKey = new LinkedHashMap<>();
        for (AdapterDefinition def : all) {
            boolean isOrgOwned = orgId.equals(def.getOrganizationId());
            boolean isPurchased = isOrgOwned || purchasedKeys.contains(def.getAdapterKey());
            if (!isPurchased) {
                continue;
            }
            if (!byKey.containsKey(def.getAdapterKey()) || isOrgOwned) {
                byKey.put(def.getAdapterKey(), def);
            }
        }

        return byKey.values().stream()
                .filter(a -> type == null || a.getAdapterType() == type)
                .filter(a -> mode == null || a.getSupportedMode() == mode || a.getSupportedMode() == AdapterMode.BOTH)
                .filter(a -> category == null || category.isBlank() || category.equalsIgnoreCase(a.getCategory()))
                .map(a -> toResponse(a, true))
                .toList();
    }

    @Transactional(readOnly = true)
    public AdapterResponse getById(String id) {
        AdapterDefinition entity = repository.findById(id)
                .orElseThrow(() -> new DatashifterException("Adapter not found with id: " + id));

        validateOrgAccess(entity);
        boolean isPurchased = isPurchasedOrOfficial(entity);
        return toResponse(entity, isPurchased);
    }

    @Transactional(readOnly = true)
    public AdapterResponse getByKey(String adapterKey) {
        String orgId = UserContext.getCurrentOrgId();
        AdapterDefinition entity = null;
        if (orgId != null && !orgId.isBlank()) {
            entity = repository.findByOrganizationIdAndAdapterKey(orgId, adapterKey).orElse(null);
        }
        if (entity == null) {
            entity = repository.findByAdapterKey(adapterKey)
                    .orElseThrow(() -> new DatashifterException("Adapter not found with key: " + adapterKey));
        }

        validateOrgAccess(entity);
        boolean isPurchased = isPurchasedOrOfficial(entity);
        return toResponse(entity, isPurchased);
    }

    @Transactional
    public void deleteAdapter(String id) {
        String orgId = requireContext(UserContext.getCurrentOrgId(), "organization");
        AdapterDefinition entity = repository.findById(id)
                .orElseThrow(() -> new DatashifterException("Adapter not found with id: " + id));

        if (Boolean.TRUE.equals(entity.getIsOfficial())) {
            throw new DatashifterException("Official built-in adapters cannot be deleted");
        }

        if (!orgId.equals(entity.getOrganizationId())) {
            throw new DatashifterException("Access denied: adapter belongs to another organization");
        }

        // Check reference count in pipelines table
        try {
            String sql = "SELECT COUNT(*) FROM pipelines WHERE source_adapter_id = ? OR target_adapter_id = ? OR source_adapter_id = ? OR target_adapter_id = ?";
            Integer count = jdbcTemplate.queryForObject(sql, Integer.class, entity.getId(), entity.getId(), entity.getAdapterKey(), entity.getAdapterKey());
            if (count != null && count > 0) {
                throw new DatashifterException("Cannot delete adapter '" + entity.getName() + "' because it is referenced in " + count + " pipeline(s)");
            }
        } catch (Exception e) {
            if (e instanceof DatashifterException de) throw de;
            log.warn("Could not check pipeline references for adapter {}: {}", id, e.getMessage());
        }

        if (entity.getStorageKey() != null && !entity.getStorageKey().isBlank()) {
            try {
                storage.delete(entity.getStorageKey());
            } catch (IOException e) {
                log.warn("Could not delete artifact file {}: {}", entity.getStorageKey(), e.getMessage());
            }
        }

        repository.delete(entity);
        log.info("Deleted adapter '{}' ({}) for org {}", entity.getName(), entity.getAdapterKey(), orgId);
    }

    public Resource loadArtifact(String id) {
        AdapterDefinition entity = repository.findById(id)
                .orElseThrow(() -> new DatashifterException("Adapter not found with id: " + id));
        validateOrgAccess(entity);

        if (entity.getStorageKey() == null || entity.getStorageKey().isBlank()) {
            throw new DatashifterException("Adapter JAR artifact path not configured");
        }

        Path path = storage.getFilePath(entity.getStorageKey());
        if (!storage.exists(entity.getStorageKey())) {
            throw new DatashifterException("Adapter JAR artifact file not found on disk");
        }

        return new FileSystemResource(path);
    }

    @Transactional
    public void syncBuiltIns() {
        seeder.seedBuiltInAdapters();
    }

    private boolean isPurchasedOrOfficial(AdapterDefinition entity) {
        if (Boolean.TRUE.equals(entity.getIsOfficial())) {
            return true;
        }
        String orgId = UserContext.getCurrentOrgId();
        if (orgId == null || orgId.isBlank()) {
            return false;
        }
        if (orgId.equals(entity.getOrganizationId())) {
            return true;
        }
        return purchasedRepo.isAdapterPurchasedByOrg(orgId, entity.getAdapterKey());
    }

    private void validateOrgAccess(AdapterDefinition entity) {
        if (Boolean.TRUE.equals(entity.getIsOfficial())) {
            return;
        }
        String orgId = UserContext.getCurrentOrgId();
        if (orgId == null || !orgId.equals(entity.getOrganizationId())) {
            throw new DatashifterException("Adapter not found or access denied");
        }
    }

    private AdapterResponse toResponse(AdapterDefinition entity, boolean isPurchased) {
        return AdapterResponse.builder()
                .id(entity.getId())
                .organizationId(entity.getOrganizationId())
                .name(entity.getName())
                .adapterKey(entity.getAdapterKey())
                .description(entity.getDescription())
                .adapterType(entity.getAdapterType())
                .supportedMode(entity.getSupportedMode())
                .category(entity.getCategory())
                .version(entity.getVersion())
                .status(entity.getStatus())
                .className(entity.getClassName())
                .artifactName(entity.getArtifactName())
                .sizeBytes(entity.getSizeBytes())
                .configSchema(entity.getConfigSchema())
                .isOfficial(Boolean.TRUE.equals(entity.getIsOfficial()))
                .isPurchased(isPurchased)
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    private String requireContext(String value, String label) {
        if (value == null || value.isBlank()) {
            throw new DatashifterException("Missing authenticated " + label + " context");
        }
        return value;
    }
}
