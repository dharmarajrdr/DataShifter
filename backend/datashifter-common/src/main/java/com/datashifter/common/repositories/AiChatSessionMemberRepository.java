package com.datashifter.common.repositories;

import com.datashifter.common.models.AiChatSessionMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface AiChatSessionMemberRepository extends JpaRepository<AiChatSessionMember, String> {

    List<AiChatSessionMember> findBySessionIdOrderByCreatedAtAsc(String sessionId);

    List<AiChatSessionMember> findBySessionIdIn(Collection<String> sessionIds);

    boolean existsBySessionIdAndUserIdAndOrgId(String sessionId, String userId, String orgId);

    long countBySessionId(String sessionId);
}

