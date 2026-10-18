package com.datashifter.udf.adapters.marketplace;

import com.datashifter.common.models.MarketplaceCatalogItem;
import com.datashifter.common.repositories.AdapterDefinitionRepository;
import com.datashifter.common.repositories.MarketplaceCatalogRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** Unit test for MarketplaceCatalogSeeder (<= 100 lines). */
@ExtendWith(MockitoExtension.class)
class MarketplaceCatalogSeederTest {

    @Mock
    private MarketplaceCatalogRepository catalogRepo;

    @Mock
    private AdapterDefinitionRepository adapterRepo;

    @Test
    void testCatalogIncludesAllGcpAdapters() {
        MarketplaceCatalogSeeder seeder = new MarketplaceCatalogSeeder(catalogRepo, adapterRepo);
        List<MarketplaceCatalogItem> items = seeder.getOfficialCatalogItems();

        assertNotNull(items);
        assertTrue(items.size() >= 14);

        List<String> keys = items.stream().map(MarketplaceCatalogItem::getAdapterKey).toList();
        assertTrue(keys.contains("spanner-reader"));
        assertTrue(keys.contains("spanner-writer"));
        assertTrue(keys.contains("bigquery-reader"));
        assertTrue(keys.contains("bigquery-writer"));
        assertTrue(keys.contains("bigtable-reader"));
        assertTrue(keys.contains("bigtable-writer"));
    }

    @Test
    void testSeedMarketplaceCatalogSavesItems() {
        when(catalogRepo.findByAdapterKey(any())).thenReturn(Optional.empty());
        when(adapterRepo.findFirstByOrganizationIdIsNullAndAdapterKey(any())).thenReturn(Optional.empty());

        MarketplaceCatalogSeeder seeder = new MarketplaceCatalogSeeder(catalogRepo, adapterRepo);
        seeder.seedMarketplaceCatalog();

        verify(catalogRepo, atLeast(14)).save(any(MarketplaceCatalogItem.class));
    }
}
