package com.datashifter.common.models;

import com.datashifter.common.enums.AiContextType;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "ai_chat_sessions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiChatSession extends BaseEntity {

    @Column(name = "org_id", nullable = false, length = 36)
    private String orgId;

    @Column(name = "user_id", nullable = false, length = 36)
    private String userId;

    @Column(nullable = false)
    @Builder.Default
    private String title = "New Beetel Chat";

    @Enumerated(EnumType.STRING)
    @Column(name = "context_type", nullable = false, length = 32)
    @Builder.Default
    private AiContextType contextType = AiContextType.NONE;

    @Column(name = "context_id", length = 36)
    private String contextId;

    @Column(name = "context_name")
    private String contextName;
}
