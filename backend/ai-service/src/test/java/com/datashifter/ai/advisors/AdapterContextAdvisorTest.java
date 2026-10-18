package com.datashifter.ai.advisors;

import com.datashifter.adapter.sdk.annotations.AdapterMode;
import com.datashifter.adapter.sdk.annotations.AdapterType;
import com.datashifter.ai.services.AgentPermissionService;
import com.datashifter.ai.services.AgentPermissionService.AgentPolicySnapshot;
import com.datashifter.common.enums.Permissions;
import com.datashifter.common.models.AdapterDefinition;
import com.datashifter.common.repositories.AdapterDefinitionRepository;
import com.datashifter.common.repositories.OrgPurchasedAdapterRepository;
import com.datashifter.common.security.UserContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdapterContextAdvisorTest {

    @Mock
    private AdapterDefinitionRepository adapterRepo;

    @Mock
    private OrgPurchasedAdapterRepository purchasedRepo;

    @Mock
    private AgentPermissionService agentPermissionService;

    private AdapterContextAdvisor advisor;

    @BeforeEach
    void setUp() {
        advisor = new AdapterContextAdvisor(adapterRepo, purchasedRepo, agentPermissionService);
    }

    @AfterEach
    void tearDown() {
        UserContext.clear();
    }

    @Test
    void buildContextSection_whenRestricted_returnsRestrictedMessage() {
        when(agentPermissionService.resolveCurrentPolicy()).thenReturn(
                new AgentPolicySnapshot(true, Set.of(), Set.of(), Set.of()));

        String res = advisor.buildContextSection("list adapters", null, null);
        assertTrue(res.contains("Restricted by Org policy"));
    }

    @Test
    void buildContextSection_whenAllowed_returnsInstalledAdapters() {
        UserContext.set(UserContext.Context.builder().orgId("org-1").build());
        when(agentPermissionService.resolveCurrentPolicy()).thenReturn(
                new AgentPolicySnapshot(true, Set.of(Permissions.ADAPTER_VIEW),
                        Set.of(Permissions.ADAPTER_VIEW), Set.of(Permissions.ADAPTER_VIEW)));

        AdapterDefinition def = AdapterDefinition.builder()
                .name("PostgreSQL Database Reader")
                .adapterKey("postgres-reader")
                .adapterType(AdapterType.READER)
                .supportedMode(AdapterMode.BATCH)
                .isOfficial(true)
                .organizationId("org-1")
                .build();
        when(purchasedRepo.findByOrganizationIdAndStatus("org-1", "ACTIVE")).thenReturn(Collections.emptyList());
        when(adapterRepo.findAllAvailableForOrg("org-1")).thenReturn(List.of(def));

        String res = advisor.buildContextSection("list adapters", null, null);
        assertTrue(res.contains("PostgreSQL Database Reader"));
        assertTrue(res.contains("postgres-reader"));
    }
}
