package com.datashifter.udf.adapters.marketplace;

import com.datashifter.adapter.sdk.annotations.AdapterMode;
import com.datashifter.adapter.sdk.annotations.AdapterType;
import com.datashifter.common.dtos.AdapterDtos.MarketplaceItemResponse;
import com.datashifter.common.dtos.AdapterDtos.PurchaseAdapterRequest;
import com.datashifter.common.dtos.AdapterDtos.PurchaseAdapterResponse;
import com.datashifter.common.exceptions.DatashifterException;
import com.datashifter.common.models.MarketplaceCatalogItem;
import com.datashifter.common.models.OrgPurchasedAdapter;
import com.datashifter.common.repositories.MarketplaceCatalogRepository;
import com.datashifter.common.repositories.OrgPurchasedAdapterRepository;
import com.datashifter.common.security.UserContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service orchestrating adapter marketplace discovery, catalog search, and organization purchase workflows.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MarketplaceService {

    private final MarketplaceCatalogRepository catalogRepo;
    private final OrgPurchasedAdapterRepository purchasedRepo;
    private final MarketplaceCatalogSeeder seeder;
    private final MarketplaceInstallService installService;

    @Transactional(readOnly = true)
    public List<MarketplaceItemResponse> getCatalog(
            String search, String category, AdapterType type, AdapterMode mode, Boolean isFree) {

        String orgId = UserContext.getCurrentOrgId();
        Set<String> purchasedKeys = new HashSet<>();
        if (orgId != null && !orgId.isBlank()) {
            List<OrgPurchasedAdapter> purchases = purchasedRepo.findByOrganizationIdAndStatus(orgId, "ACTIVE");
            purchasedKeys = purchases.stream()
                    .filter(p -> p.getMarketplaceItem() != null)
                    .map(p -> p.getMarketplaceItem().getAdapterKey())
                    .collect(Collectors.toSet());
        }

        final Set<String> activePurchasedKeys = purchasedKeys;
        List<MarketplaceCatalogItem> items = catalogRepo.findByIsActiveTrueOrderByDisplayOrderAsc();

        return items.stream()
                .filter(item -> filterBySearch(item, search))
                .filter(item -> category == null || category.isBlank() || category.equalsIgnoreCase(item.getCategory()))
                .filter(item -> type == null || item.getAdapterType() == type)
                .filter(item -> mode == null || item.getSupportedMode() == mode || item.getSupportedMode() == AdapterMode.BOTH)
                .filter(item -> isFree == null || item.getIsFree().equals(isFree))
                .map(item -> toResponse(item, activePurchasedKeys.contains(item.getAdapterKey())))
                .toList();
    }

    @Transactional(readOnly = true)
    public MarketplaceItemResponse getItemById(String id) {
        MarketplaceCatalogItem item = catalogRepo.findById(id)
                .orElseThrow(() -> new DatashifterException("Marketplace catalog item not found with id: " + id));

        boolean purchased = isItemPurchased(item.getAdapterKey());
        return toResponse(item, purchased);
    }

    @Transactional(readOnly = true)
    public MarketplaceItemResponse getItemByKey(String adapterKey) {
        MarketplaceCatalogItem item = catalogRepo.findByAdapterKey(adapterKey)
                .orElseThrow(() -> new DatashifterException("Marketplace catalog item not found with key: " + adapterKey));

        boolean purchased = isItemPurchased(item.getAdapterKey());
        return toResponse(item, purchased);
    }

    @Transactional
    public PurchaseAdapterResponse purchaseAdapter(String marketplaceItemId, PurchaseAdapterRequest request) {
        String orgId = requireContext(UserContext.getCurrentOrgId(), "organization");
        MarketplaceCatalogItem item = catalogRepo.findById(marketplaceItemId)
                .orElseThrow(() -> new DatashifterException("Marketplace catalog item not found with id: " + marketplaceItemId));

        if (!Boolean.TRUE.equals(item.getIsActive())) {
            throw new DatashifterException("This adapter is currently inactive and not available for purchase");
        }

        if (purchasedRepo.isAdapterPurchasedByOrg(orgId, item.getAdapterKey())) {
            throw new DatashifterException("Adapter '" + item.getName() + "' is already purchased and active for your organization");
        }

        boolean isFree = Boolean.TRUE.equals(item.getIsFree()) || item.getPricePaise() == 0L;
        String paymentId = request != null ? request.getPaymentId() : null;

        if (!isFree && (paymentId == null || paymentId.isBlank())) {
            paymentId = "pay_sim_" + UUID.randomUUID().toString().substring(0, 12);
            log.info("Allocated transaction identifier {} for paid adapter purchase {}", paymentId, item.getAdapterKey());
        }

        OrgPurchasedAdapter purchased = OrgPurchasedAdapter.builder()
                .organizationId(orgId)
                .marketplaceItem(item)
                .paymentId(paymentId)
                .status("ACTIVE")
                .amountPaidPaise(isFree ? 0L : item.getPricePaise())
                .currency(item.getCurrency())
                .purchasedAt(Instant.now())
                .build();

        OrgPurchasedAdapter saved = purchasedRepo.save(purchased);
        log.info("Organization {} purchased adapter '{}' ({}) - free={}", orgId, item.getName(), item.getAdapterKey(), isFree);

        return toPurchaseResponse(saved, item);
    }

    public PurchaseAdapterResponse installAdapter(String marketplaceItemId) {
        return installService.installAdapter(marketplaceItemId);
    }

    public void uninstallAdapter(String marketplaceItemId) {
        installService.uninstallAdapter(marketplaceItemId);
    }

    @Transactional(readOnly = true)
    public MarketplaceCheckoutDto.OrderResponse createCheckoutOrder(String marketplaceItemId, MarketplaceCheckoutDto.CreateOrderRequest request) {
        String orgId = requireContext(UserContext.getCurrentOrgId(), "organization");
        MarketplaceCatalogItem item = catalogRepo.findById(marketplaceItemId)
                .orElseThrow(() -> new DatashifterException("Marketplace catalog item not found with id: " + marketplaceItemId));

        if (Boolean.TRUE.equals(item.getIsFree()) || item.getPricePaise() == 0L) {
            throw new DatashifterException("Free adapters do not require checkout orders; use direct activation");
        }

        if (purchasedRepo.isAdapterPurchasedByOrg(orgId, item.getAdapterKey())) {
            throw new DatashifterException("Adapter already purchased for organization: " + orgId);
        }

        String provider = (request != null && request.getProvider() != null) ? request.getProvider() : "RAZORPAY";
        String orderId = "order_mkt_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);

        return MarketplaceCheckoutDto.OrderResponse.builder()
                .orderId(orderId)
                .marketplaceItemId(item.getId())
                .adapterKey(item.getAdapterKey())
                .adapterName(item.getName())
                .amountPaise(item.getPricePaise())
                .currency(item.getCurrency())
                .provider(provider)
                .keyId("rzp_live_datashifter")
                .build();
    }

    @Transactional(readOnly = true)
    public List<PurchaseAdapterResponse> getPurchasedAdapters() {
        String orgId = requireContext(UserContext.getCurrentOrgId(), "organization");
        List<OrgPurchasedAdapter> purchases = purchasedRepo.findByOrganizationIdAndStatus(orgId, "ACTIVE");

        return purchases.stream()
                .map(p -> toPurchaseResponse(p, p.getMarketplaceItem()))
                .toList();
    }

    @Transactional
    public void syncCatalog() {
        seeder.seedMarketplaceCatalog();
    }

    private boolean isItemPurchased(String adapterKey) {
        String orgId = UserContext.getCurrentOrgId();
        if (orgId == null || orgId.isBlank()) {
            return false;
        }
        return purchasedRepo.isAdapterPurchasedByOrg(orgId, adapterKey);
    }

    private boolean filterBySearch(MarketplaceCatalogItem item, String search) {
        if (search == null || search.isBlank()) {
            return true;
        }
        String q = search.toLowerCase().trim();
        return (item.getName() != null && item.getName().toLowerCase().contains(q))
                || (item.getAdapterKey() != null && item.getAdapterKey().toLowerCase().contains(q))
                || (item.getDescription() != null && item.getDescription().toLowerCase().contains(q))
                || (item.getCategory() != null && item.getCategory().toLowerCase().contains(q));
    }

    private MarketplaceItemResponse toResponse(MarketplaceCatalogItem item, boolean isPurchased) {
        String configSchema = null;
        String adapterDefId = null;
        if (item.getAdapterDefinition() != null) {
            configSchema = item.getAdapterDefinition().getConfigSchema();
            adapterDefId = item.getAdapterDefinition().getId();
        }

        return MarketplaceItemResponse.builder()
                .id(item.getId())
                .adapterDefinitionId(adapterDefId)
                .name(item.getName())
                .adapterKey(item.getAdapterKey())
                .description(item.getDescription())
                .category(item.getCategory())
                .adapterType(item.getAdapterType())
                .supportedMode(item.getSupportedMode())
                .pricePaise(item.getPricePaise())
                .currency(item.getCurrency())
                .isFree(Boolean.TRUE.equals(item.getIsFree()))
                .isPurchased(isPurchased)
                .iconUrl(item.getIconUrl())
                .documentationUrl(item.getDocumentationUrl())
                .displayOrder(item.getDisplayOrder())
                .configSchema(configSchema)
                .createdAt(item.getCreatedAt())
                .build();
    }

    private PurchaseAdapterResponse toPurchaseResponse(OrgPurchasedAdapter p, MarketplaceCatalogItem item) {
        return PurchaseAdapterResponse.builder()
                .id(p.getId())
                .organizationId(p.getOrganizationId())
                .marketplaceItemId(item != null ? item.getId() : null)
                .adapterKey(item != null ? item.getAdapterKey() : null)
                .adapterName(item != null ? item.getName() : null)
                .status(p.getStatus())
                .amountPaidPaise(p.getAmountPaidPaise())
                .currency(p.getCurrency())
                .purchasedAt(p.getPurchasedAt())
                .build();
    }

    private String requireContext(String value, String label) {
        if (value == null || value.isBlank()) {
            throw new DatashifterException("Missing authenticated " + label + " context");
        }
        return value;
    }
}
