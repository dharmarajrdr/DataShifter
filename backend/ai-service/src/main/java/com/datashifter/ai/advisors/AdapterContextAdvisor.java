package com.datashifter.ai.advisors;

import com.datashifter.ai.services.AgentPermissionService;
import com.datashifter.ai.spi.BeetelContextAdvisor;
import com.datashifter.common.enums.AiContextType;
import com.datashifter.common.enums.Permissions;
import com.datashifter.common.models.AdapterDefinition;
import com.datashifter.common.models.OrgPurchasedAdapter;
import com.datashifter.common.repositories.AdapterDefinitionRepository;
import com.datashifter.common.repositories.OrgPurchasedAdapterRepository;
import com.datashifter.common.security.UserContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class AdapterContextAdvisor implements BeetelContextAdvisor {

    private final AdapterDefinitionRepository adapterRepo;
    private final OrgPurchasedAdapterRepository purchasedRepo;
    private final AgentPermissionService agentPermissionService;

    @Override
    public int getOrder() {
        return 15;
    }

    @Override
    public String buildContextSection(String userMessage, AiContextType contextType, String contextId) {
        AgentPermissionService.AgentPolicySnapshot policy = agentPermissionService.resolveCurrentPolicy();
        if (!policy.isAllowed(Permissions.ADAPTER_VIEW)) {
            return "### Installed Adapters & Connectors\n- (Restricted by Org policy — missing `adapter:view` permission)\n";
        }
        String orgId = UserContext.getCurrentOrgId();
        if (orgId == null || orgId.isBlank()) return "";
        try {
            List<OrgPurchasedAdapter> purchases = purchasedRepo.findByOrganizationIdAndStatus(orgId, "ACTIVE");
            Set<String> purchasedKeys = purchases.stream()
                    .filter(p -> p.getMarketplaceItem() != null)
                    .map(p -> p.getMarketplaceItem().getAdapterKey())
                    .collect(Collectors.toSet());

            List<AdapterDefinition> all = adapterRepo.findAllAvailableForOrg(orgId);
            Map<String, AdapterDefinition> byKey = new LinkedHashMap<>();
            for (AdapterDefinition def : all) {
                boolean isOrgOwned = orgId.equals(def.getOrganizationId());
                boolean isPurchased = isOrgOwned || purchasedKeys.contains(def.getAdapterKey());
                if (!isPurchased) continue;
                if (!byKey.containsKey(def.getAdapterKey()) || isOrgOwned) {
                    byKey.put(def.getAdapterKey(), def);
                }
            }
            if (byKey.isEmpty()) {
                return "### Installed Adapters & Connectors\n- (none installed from marketplace or custom uploaded)\n";
            }
            String listStr = byKey.values().stream()
                    .map(a -> String.format("- `%s` (key=`%s`, type=%s, mode=%s, official=%s%s)",
                            a.getName(), a.getAdapterKey(), a.getAdapterType(), a.getSupportedMode(),
                            Boolean.TRUE.equals(a.getIsOfficial()),
                            a.getDescription() != null ? ", desc=\"" + a.getDescription() + "\"" : ""))
                    .collect(Collectors.joining("\n"));
            return "### Installed Adapters & Connectors (Marketplace & Custom)\n" + listStr + "\n";
        } catch (Exception e) {
            log.debug("Could not resolve installed adapters for context: {}", e.getMessage());
            return "";
        }
    }
}
