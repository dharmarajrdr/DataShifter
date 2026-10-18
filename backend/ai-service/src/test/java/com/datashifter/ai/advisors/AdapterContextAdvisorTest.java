package com.datashifter.ai.advisors;

import com.datashifter.adapter.sdk.annotations.AdapterMode;
import com.datashifter.adapter.sdk.annotations.AdapterType;
import com.datashifter.ai.services.AgentPermissionService;
import com.datashifter.ai.services.AgentPermissionService.AgentPolicySnapshot;
import com.datashifter.common.dtos.AdapterDtos.AdapterResponse;
import com.datashifter.common.enums.Permissions;
import com.datashifter.udf.adapters.services.AdapterRegistryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdapterContextAdvisorTest {

    @Mock
    private AdapterRegistryService adapterRegistryService;

    @Mock
    private AgentPermissionService agentPermissionService;

    private AdapterContextAdvisor advisor;

    @BeforeEach
    void setUp() {
        advisor = new AdapterContextAdvisor(adapterRegistryService, agentPermissionService);
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
        when(agentPermissionService.resolveCurrentPolicy()).thenReturn(
                new AgentPolicySnapshot(true, Set.of(Permissions.ADAPTER_VIEW),
                        Set.of(Permissions.ADAPTER_VIEW), Set.of(Permissions.ADAPTER_VIEW)));

        AdapterResponse ad = AdapterResponse.builder()
                .name("PostgreSQL Database Reader")
                .adapterKey("postgres-reader")
                .adapterType(AdapterType.READER)
                .supportedMode(AdapterMode.BATCH)
                .isOfficial(true)
                .build();
        when(adapterRegistryService.getAllAvailable(any(), any(), any())).thenReturn(List.of(ad));

        String res = advisor.buildContextSection("list adapters", null, null);
        assertTrue(res.contains("PostgreSQL Database Reader"));
        assertTrue(res.contains("postgres-reader"));
    }
}
