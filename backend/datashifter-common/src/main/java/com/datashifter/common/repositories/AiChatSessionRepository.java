package com.datashifter.common.repositories;

import com.datashifter.common.enums.AiContextType;
import com.datashifter.common.models.AiChatSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AiChatSessionRepository extends JpaRepository<AiChatSession, String> {

    List<AiChatSession> findByUserIdAndOrgIdOrderByUpdatedAtDesc(String userId, String orgId);

    List<AiChatSession> findByUserIdAndOrgIdAndContextTypeAndContextIdOrderByUpdatedAtDesc(
            String userId, String orgId, AiContextType contextType, String contextId);

    Optional<AiChatSession> findByIdAndUserIdAndOrgId(String id, String userId, String orgId);
}
