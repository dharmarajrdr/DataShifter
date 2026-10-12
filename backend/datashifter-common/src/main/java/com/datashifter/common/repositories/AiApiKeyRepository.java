package com.datashifter.common.repositories;

import com.datashifter.common.enums.AiKeyScope;
import com.datashifter.common.models.AiApiKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AiApiKeyRepository extends JpaRepository<AiApiKey, String> {

    List<AiApiKey> findByScopeAndUserIdOrderByPriorityOrderAscCreatedAtAsc(AiKeyScope scope, String userId);

    List<AiApiKey> findByScopeAndOrgIdOrderByPriorityOrderAscCreatedAtAsc(AiKeyScope scope, String orgId);

    List<AiApiKey> findByScopeAndUserIdAndIsActiveTrueOrderByPriorityOrderAscCreatedAtAsc(AiKeyScope scope, String userId);

    List<AiApiKey> findByScopeAndOrgIdAndIsActiveTrueOrderByPriorityOrderAscCreatedAtAsc(AiKeyScope scope, String orgId);
}
