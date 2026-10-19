package com.datashifter.udf.adapters;

import com.datashifter.adapter.sdk.annotations.AdapterMode;
import com.datashifter.adapter.sdk.annotations.AdapterType;
import com.datashifter.common.dtos.AdapterDtos.AdapterResponse;
import com.datashifter.common.exceptions.DatashifterException;
import com.datashifter.common.models.AdapterDefinition;
import com.datashifter.common.models.MarketplaceCatalogItem;
import com.datashifter.common.models.OrgPurchasedAdapter;
import com.datashifter.common.repositories.AdapterDefinitionRepository;
import com.datashifter.common.repositories.OrgPurchasedAdapterRepository;
import com.datashifter.common.security.UserContext;
import com.datashifter.udf.adapters.discovery.AdapterDiscovery;
import com.datashifter.udf.adapters.services.AdapterRegistryService;
import com.datashifter.udf.adapters.services.BuiltInAdapterSeeder;
import com.datashifter.udf.adapters.storage.AdapterArtifactStorage;
import com.datashifter.udf.adapters.validation.AdapterArtifactValidator;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import com.datashifter.udf.adapters.services.AdapterReferenceService;
import org.springframework.mock.web.MockMultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdapterRegistryServiceTest {

    @Mock
    private AdapterDefinitionRepository repository;

    @Mock
    private OrgPurchasedAdapterRepository purchasedRepo;

    @Mock
    private AdapterArtifactValidator validator;

    @Mock
    private AdapterDiscovery discovery;

    @Mock
    private AdapterArtifactStorage storage;

    @Mock
    private BuiltInAdapterSeeder seeder;

    @Mock
    private AdapterReferenceService referenceService;

    private AdapterRegistryService service;

    @BeforeEach
    void setUp() {
        service = new AdapterRegistryService(
                repository, purchasedRepo, validator, discovery, storage, seeder, referenceService
        );

        UserContext.set(UserContext.Context.builder()
                .orgId("org-123")
                .userId("user-456")
                .role("ADMIN")
                .permissions(Set.of("adapter:view", "adapter:create", "adapter:delete"))
                .build());
    }

    @AfterEach
    void tearDown() {
        UserContext.clear();
    }

    @Test
    void testGetAllAvailableFilters() {
        AdapterDefinition officialReader = AdapterDefinition.builder()
                .adapterKey("oracle-reader")
                .name("Oracle Database Reader")
                .adapterType(AdapterType.READER)
                .supportedMode(AdapterMode.BATCH)
                .category("database")
                .isOfficial(true)
                .build();

        AdapterDefinition customWriter = AdapterDefinition.builder()
                .organizationId("org-123")
                .adapterKey("custom-writer")
                .name("Custom Writer")
                .adapterType(AdapterType.WRITER)
                .supportedMode(AdapterMode.BOTH)
                .category("custom")
                .isOfficial(false)
                .build();

        MarketplaceCatalogItem mktItem = MarketplaceCatalogItem.builder().adapterKey("oracle-reader").build();
        OrgPurchasedAdapter purchase = OrgPurchasedAdapter.builder().marketplaceItem(mktItem).status("ACTIVE").build();

        when(repository.findAllAvailableForOrg("org-123")).thenReturn(List.of(officialReader, customWriter));
        when(purchasedRepo.findByOrganizationIdAndStatus("org-123", "ACTIVE")).thenReturn(List.of(purchase));
        when(referenceService.getPipelineReferences()).thenReturn(java.util.Map.of("oracle-reader", java.util.Set.of("p1", "p2")));
        when(referenceService.countPipelines(any(), eq("oracle-reader"), any())).thenReturn(2);

        List<AdapterResponse> all = service.getAllAvailable(null, null, null);
        assertEquals(2, all.size());
        assertTrue(all.get(0).isOfficial());
        assertTrue(all.get(0).isPurchased());
        assertEquals(2, all.get(0).getPipelineCount());

        List<AdapterResponse> readersOnly = service.getAllAvailable(AdapterType.READER, null, null);
        assertEquals(1, readersOnly.size());
        assertEquals("oracle-reader", readersOnly.get(0).getAdapterKey());
        assertEquals(2, readersOnly.get(0).getPipelineCount());
    }

    @Test
    void testGetByIdOfficialAllowed() {
        AdapterDefinition official = AdapterDefinition.builder()
                .adapterKey("oracle-reader")
                .name("Oracle Reader")
                .isOfficial(true)
                .build();
        official.setId("ad-1");

        when(repository.findById("ad-1")).thenReturn(Optional.of(official));

        AdapterResponse response = service.getById("ad-1");
        assertNotNull(response);
        assertEquals("oracle-reader", response.getAdapterKey());
        assertTrue(response.isOfficial());
        assertTrue(response.isPurchased());
    }

    @Test
    void testGetByIdOtherOrgDenied() {
        AdapterDefinition privateOtherOrg = AdapterDefinition.builder()
                .organizationId("other-org")
                .adapterKey("secret-adapter")
                .isOfficial(false)
                .build();
        privateOtherOrg.setId("ad-2");

        when(repository.findById("ad-2")).thenReturn(Optional.of(privateOtherOrg));

        assertThrows(DatashifterException.class, () -> service.getById("ad-2"));
    }

    @Test
    void testDeleteOfficialThrowsException() {
        AdapterDefinition official = AdapterDefinition.builder()
                .adapterKey("oracle-reader")
                .isOfficial(true)
                .build();
        official.setId("ad-1");

        when(repository.findById("ad-1")).thenReturn(Optional.of(official));

        assertThrows(DatashifterException.class, () -> service.deleteAdapter("ad-1"));
        verify(repository, never()).delete(any());
    }

    @Test
    void testDeleteCustomSuccess() throws IOException {
        AdapterDefinition custom = AdapterDefinition.builder()
                .organizationId("org-123")
                .adapterKey("custom-adapter")
                .storageKey("org-123/adapters/file.jar")
                .isOfficial(false)
                .build();
        custom.setId("ad-3");

        when(repository.findById("ad-3")).thenReturn(Optional.of(custom));
        when(referenceService.countPipelines("ad-3", "custom-adapter")).thenReturn(0);

        service.deleteAdapter("ad-3");

        verify(storage).delete("org-123/adapters/file.jar");
        verify(repository).delete(custom);
    }

    @Test
    void testUploadAdapterSuccess() throws IOException {
        MockMultipartFile file = new MockMultipartFile("file", "my-adapter.jar", "application/java-archive", "mock-jar".getBytes());

        AdapterDiscovery.DiscoveredAdapter discovered = AdapterDiscovery.DiscoveredAdapter.builder()
                .adapterKey("discovered-writer")
                .name("Discovered Writer")
                .description("Discovered description")
                .adapterType(AdapterType.WRITER)
                .supportedMode(AdapterMode.BOTH)
                .category("storage")
                .version("1.0.0")
                .className("com.example.DiscoveredWriter")
                .configSchema("{\"properties\":[]}")
                .build();

        when(repository.findByOrganizationIdAndAdapterKey("org-123", "discovered-writer")).thenReturn(Optional.empty());
        when(discovery.discover(file)).thenReturn(List.of(discovered));
        when(storage.store(eq(file), anyString()))
                .thenReturn(new AdapterArtifactStorage.StoredArtifact("sha256hash", 1024L, null));

        when(repository.save(any(AdapterDefinition.class))).thenAnswer(inv -> {
            AdapterDefinition saved = inv.getArgument(0);
            saved.setId("ad-new-1");
            return saved;
        });

        AdapterResponse response = service.uploadAdapter("Custom Uploaded", "Description", file);

        assertNotNull(response);
        assertEquals("discovered-writer", response.getAdapterKey());
        assertEquals("Custom Uploaded", response.getName());
        assertFalse(response.isOfficial());
        assertTrue(response.isPurchased());
        verify(validator).validate(file);
        verify(repository).save(any(AdapterDefinition.class));
    }
}
