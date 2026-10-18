package com.datashifter.udf.adapters.marketplace;

import com.datashifter.common.exceptions.DatashifterException;
import com.datashifter.common.models.AdapterDefinition;
import com.datashifter.common.models.MarketplaceCatalogItem;
import com.datashifter.common.models.OrgPurchasedAdapter;
import com.datashifter.common.repositories.AdapterDefinitionRepository;
import com.datashifter.common.repositories.MarketplaceCatalogRepository;
import com.datashifter.common.repositories.OrgPurchasedAdapterRepository;
import com.datashifter.common.security.UserContext;
import com.datashifter.udf.adapters.discovery.AdapterDiscovery;
import com.datashifter.udf.adapters.storage.AdapterArtifactResolver;
import com.datashifter.udf.adapters.storage.AdapterArtifactStorage;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MarketplaceInstallServiceTest {
    @Mock private MarketplaceCatalogRepository catalogRepo;
    @Mock private OrgPurchasedAdapterRepository purchasedRepo;
    @Mock private AdapterDefinitionRepository definitionRepo;
    @Mock private AdapterArtifactResolver artifactResolver;
    @Mock private AdapterArtifactStorage storage;
    @Mock private AdapterDiscovery discovery;
    @Mock private JdbcTemplate jdbcTemplate;

    private MarketplaceInstallService service;

    @BeforeEach
    void setUp() {
        service = new MarketplaceInstallService(catalogRepo, purchasedRepo, definitionRepo, artifactResolver, storage, discovery, jdbcTemplate);
        UserContext.set(UserContext.Context.builder().orgId("org-123").userId("user-456").role("ADMIN").permissions(Set.of("adapter:view")).build());
    }

    @AfterEach
    void tearDown() { UserContext.clear(); }

    @Test
    void testUninstallFailsWhenReferencedInPipelines() {
        var item = MarketplaceCatalogItem.builder().adapterKey("postgres-reader").name("PostgreSQL Reader").build();
        item.setId("item-pg");
        var pa = OrgPurchasedAdapter.builder().organizationId("org-123").marketplaceItem(item).build();

        when(catalogRepo.findById("item-pg")).thenReturn(Optional.of(item));
        when(purchasedRepo.findByOrganizationIdAndMarketplaceItemId("org-123", "item-pg")).thenReturn(Optional.of(pa));
        when(definitionRepo.findByOrganizationIdAndAdapterKey("org-123", "postgres-reader")).thenReturn(Optional.empty());
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), any(), any(), any(), any(), any(), any())).thenReturn(5);

        DatashifterException ex = assertThrows(DatashifterException.class, () -> service.uninstallAdapter("item-pg"));
        assertTrue(ex.getMessage().contains("referenced in 5 pipeline(s)"));
        verify(purchasedRepo, never()).delete(any());
    }

    @Test
    void testUninstallSucceedsWhenNotReferenced() {
        var item = MarketplaceCatalogItem.builder().adapterKey("oracle-writer").name("Oracle Writer").build();
        item.setId("item-ora");
        var pa = OrgPurchasedAdapter.builder().organizationId("org-123").marketplaceItem(item).build();
        var def = AdapterDefinition.builder().organizationId("org-123").adapterKey("oracle-writer").storageKey("path/ora.jar").build();
        def.setId("def-ora");

        when(catalogRepo.findById("item-ora")).thenReturn(Optional.of(item));
        when(purchasedRepo.findByOrganizationIdAndMarketplaceItemId("org-123", "item-ora")).thenReturn(Optional.of(pa));
        when(definitionRepo.findByOrganizationIdAndAdapterKey("org-123", "oracle-writer")).thenReturn(Optional.of(def));
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), any(), any(), any(), any(), any(), any())).thenReturn(0);

        service.uninstallAdapter("item-ora");
        verify(purchasedRepo).delete(pa);
        verify(definitionRepo).delete(def);
    }
}
