package com.datashifter.udf.adapters.marketplace;

import com.datashifter.common.dtos.AdapterDtos.PurchaseAdapterResponse;
import com.datashifter.common.exceptions.DatashifterException;
import com.datashifter.common.models.*;
import com.datashifter.common.repositories.*;
import com.datashifter.common.security.UserContext;
import com.datashifter.udf.adapters.discovery.AdapterDiscovery;
import com.datashifter.udf.adapters.storage.AdapterArtifactResolver;
import com.datashifter.udf.adapters.storage.AdapterArtifactStorage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.io.IOException;
import java.time.Instant;

/**
 * Service managing 1-click install and uninstall of Marketplace adapters (<= 100 lines).
 */
@Service @RequiredArgsConstructor @Slf4j
public class MarketplaceInstallService {
    private final MarketplaceCatalogRepository catalogRepo;
    private final OrgPurchasedAdapterRepository purchasedRepo;
    private final AdapterDefinitionRepository definitionRepo;
    private final AdapterArtifactResolver artifactResolver;
    private final AdapterArtifactStorage storage;
    private final AdapterDiscovery discovery;
    private final JdbcTemplate jdbcTemplate;

    @Transactional
    public PurchaseAdapterResponse installAdapter(String marketplaceItemId) {
        String orgId = ctx(UserContext.getCurrentOrgId(), "organization");
        String userId = ctx(UserContext.getCurrentUserId(), "user");
        MarketplaceCatalogItem item = catalogRepo.findById(marketplaceItemId)
                .orElseThrow(() -> new DatashifterException("Marketplace catalog item not found: " + marketplaceItemId));
        if (purchasedRepo.isAdapterPurchasedByOrg(orgId, item.getAdapterKey())) {
            throw new DatashifterException("Adapter '" + item.getName() + "' is already installed");
        }
        String storageKey = orgId + "/adapters/" + item.getAdapterKey() + ".jar";
        AdapterArtifactStorage.StoredArtifact stored;
        try (var res = artifactResolver.resolve(item.getAdapterKey())) {
            stored = storage.store(res.inputStream(), storageKey);
        } catch (IOException e) {
            throw new DatashifterException("Failed to store adapter JAR: " + e.getMessage(), e);
        }
        var disc = discovery.discover(stored.localPath().toFile());
        var p = disc.isEmpty() ? null : disc.get(0);
        String cls = p != null ? p.getClassName() : "com.datashifter.adapter." + item.getAdapterKey();

        AdapterDefinition def = definitionRepo.findByOrganizationIdAndAdapterKey(orgId, item.getAdapterKey())
                .orElse(AdapterDefinition.builder().organizationId(orgId).adapterKey(item.getAdapterKey()).build());
        def.setName(item.getName()); def.setDescription(item.getDescription());
        def.setAdapterType(item.getAdapterType()); def.setSupportedMode(item.getSupportedMode());
        def.setCategory(item.getCategory()); def.setVersion(p != null ? p.getVersion() : "1.0.0");
        def.setStatus("READY"); def.setClassName(cls); def.setStorageKey(storageKey);
        def.setArtifactName(item.getAdapterKey() + ".jar"); def.setArtifactSha256(stored.sha256());
        def.setSizeBytes(stored.sizeBytes()); def.setConfigSchema(p != null ? p.getConfigSchema() : null);
        def.setIsOfficial(true); def.setCreatedByUserId(userId);
        definitionRepo.save(def);

        OrgPurchasedAdapter pa = OrgPurchasedAdapter.builder().organizationId(orgId).marketplaceItem(item)
                .status("ACTIVE").amountPaidPaise(0L).currency(item.getCurrency()).purchasedAt(Instant.now()).build();
        OrgPurchasedAdapter saved = purchasedRepo.save(pa);
        log.info("Installed adapter '{}' ({}) for org {}", item.getName(), item.getAdapterKey(), orgId);
        return PurchaseAdapterResponse.builder().id(saved.getId()).organizationId(orgId)
                .marketplaceItemId(item.getId()).adapterKey(item.getAdapterKey()).adapterName(item.getName())
                .status("ACTIVE").amountPaidPaise(0L).currency(item.getCurrency()).purchasedAt(saved.getPurchasedAt()).build();
    }

    @Transactional
    public void uninstallAdapter(String marketplaceItemId) {
        String orgId = ctx(UserContext.getCurrentOrgId(), "organization");
        MarketplaceCatalogItem item = catalogRepo.findById(marketplaceItemId)
                .orElseThrow(() -> new DatashifterException("Marketplace catalog item not found: " + marketplaceItemId));
        OrgPurchasedAdapter p = purchasedRepo.findByOrganizationIdAndMarketplaceItemId(orgId, marketplaceItemId)
                .orElseThrow(() -> new DatashifterException("Adapter '" + item.getName() + "' is not installed"));

        String sql = "SELECT COUNT(*) FROM pipelines WHERE source_adapter_id = ? OR target_adapter_id = ? OR source_adapter_id = ? OR target_adapter_id = ?";
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, item.getAdapterKey(), item.getAdapterKey(), item.getId(), item.getId());
        if (count != null && count > 0) {
            throw new DatashifterException("Cannot uninstall adapter '" + item.getName() + "': referenced by " + count + " pipeline(s)");
        }
        purchasedRepo.delete(p);
        definitionRepo.findByOrganizationIdAndAdapterKey(orgId, item.getAdapterKey()).ifPresent(d -> {
            if (d.getStorageKey() != null) {
                try { storage.delete(d.getStorageKey()); } catch (IOException ignored) {}
            }
            definitionRepo.delete(d);
        });
        log.info("Uninstalled adapter '{}' ({}) for org {}", item.getName(), item.getAdapterKey(), orgId);
    }

    private String ctx(String val, String lbl) {
        if (val == null || val.isBlank()) throw new DatashifterException("Missing " + lbl + " context");
        return val;
    }
}
