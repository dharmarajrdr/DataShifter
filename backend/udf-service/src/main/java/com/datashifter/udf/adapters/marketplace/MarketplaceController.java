package com.datashifter.udf.adapters.marketplace;

import com.datashifter.adapter.sdk.annotations.AdapterMode;
import com.datashifter.adapter.sdk.annotations.AdapterType;
import com.datashifter.common.dtos.AdapterDtos.MarketplaceItemResponse;
import com.datashifter.common.dtos.AdapterDtos.PurchaseAdapterRequest;
import com.datashifter.common.dtos.AdapterDtos.PurchaseAdapterResponse;
import com.datashifter.common.dtos.ApiResponse;
import com.datashifter.common.enums.Permissions;
import com.datashifter.common.security.RequiresPermission;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller exposing endpoints for browsing the adapter marketplace,
 * creating checkout orders, and purchasing/activating adapters.
 */
@RestController
@RequestMapping("/api/v1/marketplace")
@RequiredArgsConstructor
public class MarketplaceController {

    private final MarketplaceService marketplaceService;

    @GetMapping("/catalog")
    @RequiresPermission(Permissions.ADAPTER_VIEW)
    public ApiResponse<List<MarketplaceItemResponse>> getCatalog(
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "type", required = false) AdapterType type,
            @RequestParam(value = "mode", required = false) AdapterMode mode,
            @RequestParam(value = "isFree", required = false) Boolean isFree) {
        return ApiResponse.success(marketplaceService.getCatalog(search, category, type, mode, isFree));
    }

    @GetMapping("/items/{id}")
    @RequiresPermission(Permissions.ADAPTER_VIEW)
    public ApiResponse<MarketplaceItemResponse> getItemById(@PathVariable String id) {
        return ApiResponse.success(marketplaceService.getItemById(id));
    }

    @GetMapping("/items/key/{adapterKey}")
    @RequiresPermission(Permissions.ADAPTER_VIEW)
    public ApiResponse<MarketplaceItemResponse> getItemByKey(@PathVariable String adapterKey) {
        return ApiResponse.success(marketplaceService.getItemByKey(adapterKey));
    }

    @PostMapping("/items/{id}/purchase")
    @RequiresPermission(Permissions.ADAPTER_PURCHASE)
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<PurchaseAdapterResponse> purchaseAdapter(
            @PathVariable String id,
            @RequestBody(required = false) PurchaseAdapterRequest request) {
        return ApiResponse.success(marketplaceService.purchaseAdapter(id, request), "Adapter purchased and activated successfully");
    }

    @PostMapping("/items/{id}/checkout")
    @RequiresPermission(Permissions.ADAPTER_PURCHASE)
    public ApiResponse<MarketplaceCheckoutDto.OrderResponse> createCheckoutOrder(
            @PathVariable String id,
            @RequestBody(required = false) MarketplaceCheckoutDto.CreateOrderRequest request) {
        return ApiResponse.success(marketplaceService.createCheckoutOrder(id, request));
    }

    @GetMapping("/purchases")
    @RequiresPermission(Permissions.ADAPTER_VIEW)
    public ApiResponse<List<PurchaseAdapterResponse>> getPurchases() {
        return ApiResponse.success(marketplaceService.getPurchasedAdapters());
    }

    @PostMapping("/sync-catalog")
    @RequiresPermission(Permissions.SETTINGS_EDIT)
    public ApiResponse<String> syncCatalog() {
        marketplaceService.syncCatalog();
        return ApiResponse.success("Marketplace catalog synchronized successfully");
    }
}
