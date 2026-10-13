package com.datashifter.common.models;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
        name = "ai_chat_session_members",
        uniqueConstraints = @UniqueConstraint(name = "uk_ai_chat_session_member", columnNames = {"session_id", "user_id"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiChatSessionMember extends BaseEntity {

    @Column(name = "session_id", nullable = false, length = 36)
    private String sessionId;

    @Column(name = "org_id", nullable = false, length = 36)
    private String orgId;

    @Column(name = "user_id", nullable = false, length = 36)
    private String userId;

    @Column(name = "granted_by_user_id", length = 36)
    private String grantedByUserId;
}

