package com.datashifter.common.repositories;

import com.datashifter.common.enums.AiContextType;
import com.datashifter.common.models.AiChatSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AiChatSessionRepository extends JpaRepository<AiChatSession, String> {

    List<AiChatSession> findByUserIdAndOrgIdOrderByUpdatedAtDesc(String userId, String orgId);

    List<AiChatSession> findByUserIdAndOrgIdAndContextTypeAndContextIdOrderByUpdatedAtDesc(
            String userId, String orgId, AiContextType contextType, String contextId);

    Optional<AiChatSession> findByIdAndUserIdAndOrgId(String id, String userId, String orgId);

    Optional<AiChatSession> findByIdAndOrgId(String id, String orgId);

    @Query("""
        SELECT DISTINCT s FROM AiChatSession s
        WHERE s.orgId = :orgId
          AND (
            s.userId = :userId
            OR EXISTS (
              SELECT 1 FROM AiChatSessionMember m
              WHERE m.sessionId = s.id AND m.userId = :userId AND m.orgId = :orgId
            )
          )
        ORDER BY s.updatedAt DESC
    """)
    List<AiChatSession> findAccessibleSessionsByUserAndOrg(
            @Param("userId") String userId,
            @Param("orgId") String orgId);

    @Query("""
        SELECT DISTINCT s FROM AiChatSession s
        WHERE s.orgId = :orgId
          AND s.contextType = :contextType
          AND s.contextId = :contextId
          AND (
            s.userId = :userId
            OR EXISTS (
              SELECT 1 FROM AiChatSessionMember m
              WHERE m.sessionId = s.id AND m.userId = :userId AND m.orgId = :orgId
            )
          )
        ORDER BY s.updatedAt DESC
    """)
    List<AiChatSession> findAccessibleSessionsByUserAndOrgAndContext(
            @Param("userId") String userId,
            @Param("orgId") String orgId,
            @Param("contextType") AiContextType contextType,
            @Param("contextId") String contextId);
}
