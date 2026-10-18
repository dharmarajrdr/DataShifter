package com.datashifter.udf.adapters.marketplace;

import com.datashifter.adapter.sdk.annotations.AdapterMode;
import com.datashifter.adapter.sdk.annotations.AdapterType;
import com.datashifter.common.dtos.AdapterDtos.MarketplaceItemResponse;
import com.datashifter.common.dtos.AdapterDtos.PurchaseAdapterRequest;
import com.datashifter.common.dtos.AdapterDtos.PurchaseAdapterResponse;
import com.datashifter.common.exceptions.DatashifterException;
import com.datashifter.common.models.AdapterDefinition;
import com.datashifter.common.models.MarketplaceCatalogItem;
import com.datashifter.common.models.OrgPurchasedAdapter;
import com.datashifter.common.repositories.MarketplaceCatalogRepository;
import com.datashifter.common.repositories.OrgPurchasedAdapterRepository;
import com.datashifter.common.security.UserContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MarketplaceServiceTest {

    @Mock
    private MarketplaceCatalogRepository catalogRepo;

    @Mock
    private OrgPurchasedAdapterRepository purchasedRepo;

    @Mock
    private MarketplaceCatalogSeeder seeder;

    @Mock
    private MarketplaceInstallService installService;

    private MarketplaceService service;

    @BeforeEach
    void setUp() {
        service = new MarketplaceService(catalogRepo, purchasedRepo, seeder, installService);

        UserContext.set(UserContext.Context.builder()
                .orgId("org-123")
                .userId("user-456")
                .role("ADMIN")
                .permissions(Set.of("adapter:view", "adapter:purchase"))
                .build());
    }

    @AfterEach
    void tearDown() {
        UserContext.clear();
    }

    @Test
    void testGetCatalogFiltering() {
        MarketplaceCatalogItem freeReader = MarketplaceCatalogItem.builder()
                .adapterKey("oracle-reader")
                .name("Oracle Database Reader")
                .category("database")
                .adapterType(AdapterType.READER)
                .supportedMode(AdapterMode.BATCH)
                .pricePaise(0L)
                .isFree(true)
                .displayOrder(1)
                .isActive(true)
                .build();
        freeReader.setId("item-1");

        MarketplaceCatalogItem paidWriter = MarketplaceCatalogItem.builder()
                .adapterKey("kafka-writer")
                .name("Apache Kafka Writer")
                .category("messaging")
                .adapterType(AdapterType.WRITER)
                .supportedMode(AdapterMode.BOTH)
                .pricePaise(199900L)
                .isFree(false)
                .displayOrder(2)
                .isActive(true)
                .build();
        paidWriter.setId("item-2");

        when(catalogRepo.findByIsActiveTrueOrderByDisplayOrderAsc()).thenReturn(List.of(freeReader, paidWriter));
        when(purchasedRepo.findByOrganizationIdAndStatus("org-123", "ACTIVE")).thenReturn(List.of());

        List<MarketplaceItemResponse> all = service.getCatalog(null, null, null, null, null);
        assertEquals(2, all.size());
        assertTrue(all.get(0).isFree());
        assertFalse(all.get(0).isPurchased());
        assertFalse(all.get(1).isFree());
        assertFalse(all.get(1).isPurchased());

        // Test search filter
        List<MarketplaceItemResponse> searched = service.getCatalog("Kafka", null, null, null, null);
        assertEquals(1, searched.size());
        assertEquals("kafka-writer", searched.get(0).getAdapterKey());

        // Test isFree filter
        List<MarketplaceItemResponse> freeOnly = service.getCatalog(null, null, null, null, true);
        assertEquals(1, freeOnly.size());
        assertEquals("oracle-reader", freeOnly.get(0).getAdapterKey());
    }

    @Test
    void testGetItemByIdWithConfigSchema() {
        AdapterDefinition def = AdapterDefinition.builder()
                .configSchema("{\"properties\":[{\"name\":\"topic\"}]}")
                .build();
        def.setId("def-1");

        MarketplaceCatalogItem item = MarketplaceCatalogItem.builder()
                .adapterKey("kafka-writer")
                .name("Apache Kafka Writer")
                .adapterDefinition(def)
                .pricePaise(199900L)
                .isFree(false)
                .build();
        item.setId("item-10");

        when(catalogRepo.findById("item-10")).thenReturn(Optional.of(item));
        when(purchasedRepo.isAdapterPurchasedByOrg("org-123", "kafka-writer")).thenReturn(true);

        MarketplaceItemResponse response = service.getItemById("item-10");
        assertNotNull(response);
        assertEquals("kafka-writer", response.getAdapterKey());
        assertTrue(response.isPurchased());
        assertEquals("def-1", response.getAdapterDefinitionId());
        assertTrue(response.getConfigSchema().contains("topic"));
    }

    @Test
    void testPurchaseFreeAdapterSuccess() {
        MarketplaceCatalogItem freeItem = MarketplaceCatalogItem.builder()
                .adapterKey("postgres-reader")
                .name("PostgreSQL Database Reader")
                .pricePaise(0L)
                .currency("INR")
                .isFree(true)
                .isActive(true)
                .build();
        freeItem.setId("item-free");

        when(catalogRepo.findById("item-free")).thenReturn(Optional.of(freeItem));
        when(purchasedRepo.isAdapterPurchasedByOrg("org-123", "postgres-reader")).thenReturn(false);
        when(purchasedRepo.save(any(OrgPurchasedAdapter.class))).thenAnswer(inv -> {
            OrgPurchasedAdapter saved = inv.getArgument(0);
            saved.setId("purchased-1");
            return saved;
        });

        PurchaseAdapterResponse response = service.purchaseAdapter("item-free", null);

        assertNotNull(response);
        assertEquals("org-123", response.getOrganizationId());
        assertEquals("postgres-reader", response.getAdapterKey());
        assertEquals(0L, response.getAmountPaidPaise());
        assertEquals("ACTIVE", response.getStatus());
        verify(purchasedRepo).save(any(OrgPurchasedAdapter.class));
    }

    @Test
    void testPurchasePaidAdapterSuccess() {
        MarketplaceCatalogItem paidItem = MarketplaceCatalogItem.builder()
                .adapterKey("oracle-gg-reader")
                .name("Oracle GoldenGate CDC Reader")
                .pricePaise(499900L)
                .currency("INR")
                .isFree(false)
                .isActive(true)
                .build();
        paidItem.setId("item-gg");

        when(catalogRepo.findById("item-gg")).thenReturn(Optional.of(paidItem));
        when(purchasedRepo.isAdapterPurchasedByOrg("org-123", "oracle-gg-reader")).thenReturn(false);
        when(purchasedRepo.save(any(OrgPurchasedAdapter.class))).thenAnswer(inv -> {
            OrgPurchasedAdapter saved = inv.getArgument(0);
            saved.setId("purchased-2");
            return saved;
        });

        PurchaseAdapterRequest request = PurchaseAdapterRequest.builder()
                .paymentId("pay_live_abc123")
                .build();

        PurchaseAdapterResponse response = service.purchaseAdapter("item-gg", request);

        assertNotNull(response);
        assertEquals("oracle-gg-reader", response.getAdapterKey());
        assertEquals(499900L, response.getAmountPaidPaise());
        verify(purchasedRepo).save(any(OrgPurchasedAdapter.class));
    }

    @Test
    void testPurchaseAlreadyPurchasedThrowsException() {
        MarketplaceCatalogItem item = MarketplaceCatalogItem.builder()
                .adapterKey("kafka-writer")
                .name("Kafka Writer")
                .isActive(true)
                .build();
        item.setId("item-kafka");

        when(catalogRepo.findById("item-kafka")).thenReturn(Optional.of(item));
        when(purchasedRepo.isAdapterPurchasedByOrg("org-123", "kafka-writer")).thenReturn(true);

        assertThrows(DatashifterException.class, () -> service.purchaseAdapter("item-kafka", null));
        verify(purchasedRepo, never()).save(any());
    }

    @Test
    void testCreateCheckoutOrderForPaidAdapter() {
        MarketplaceCatalogItem paidItem = MarketplaceCatalogItem.builder()
                .adapterKey("postgres-wal-reader")
                .name("PostgreSQL WAL CDC Reader")
                .pricePaise(299900L)
                .currency("INR")
                .isFree(false)
                .build();
        paidItem.setId("item-wal");

        when(catalogRepo.findById("item-wal")).thenReturn(Optional.of(paidItem));
        when(purchasedRepo.isAdapterPurchasedByOrg("org-123", "postgres-wal-reader")).thenReturn(false);

        MarketplaceCheckoutDto.CreateOrderRequest req = MarketplaceCheckoutDto.CreateOrderRequest.builder()
                .provider("RAZORPAY")
                .build();

        MarketplaceCheckoutDto.OrderResponse order = service.createCheckoutOrder("item-wal", req);

        assertNotNull(order);
        assertEquals("postgres-wal-reader", order.getAdapterKey());
        assertEquals(299900L, order.getAmountPaise());
        assertTrue(order.getOrderId().startsWith("order_mkt_"));
        assertEquals("RAZORPAY", order.getProvider());
    }
}
