package com.datashifter.common.repositories;

import com.datashifter.common.models.AiChatMessage;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface AiChatMessageRepository extends JpaRepository<AiChatMessage, String> {

    List<AiChatMessage> findBySessionIdOrderByCreatedAtAsc(String sessionId);

    @Query("""
            SELECT m FROM AiChatMessage m
            WHERE m.sessionId = :sessionId
            ORDER BY m.createdAt DESC, m.id DESC
            """)
    List<AiChatMessage> findLatestMessages(
            @Param("sessionId") String sessionId,
            Pageable pageable
    );

    @Query("""
            SELECT m FROM AiChatMessage m
            WHERE m.sessionId = :sessionId
              AND (m.createdAt < :beforeCreatedAt
                   OR (m.createdAt = :beforeCreatedAt AND m.id < :beforeId))
            ORDER BY m.createdAt DESC, m.id DESC
            """)
    List<AiChatMessage> findOlderMessages(
            @Param("sessionId") String sessionId,
            @Param("beforeCreatedAt") Instant beforeCreatedAt,
            @Param("beforeId") String beforeId,
            Pageable pageable
    );

    void deleteBySessionId(String sessionId);
}
