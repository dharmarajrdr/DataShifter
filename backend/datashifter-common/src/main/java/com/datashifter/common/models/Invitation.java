package com.datashifter.common.models;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity @Table(name = "invitations")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Invitation extends BaseEntity {

    @JoinColumn(name = "org_id", nullable = false)
    @ManyToOne(fetch = FetchType.LAZY)
    private Organization organization;

    @Column(nullable = false, length = 255)
    private String email;

    @Column(name = "role_id", length = 36)
    private String roleId;

    /** INVITE or REQUEST */
    @Column(name = "invite_type", nullable = false, length = 20)
    private String inviteType;

    /** PENDING, ACCEPTED, REJECTED, EXPIRED */
    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "PENDING";

    @Column(unique = true, length = 255)
    private String token;

    @Column(name = "invited_by", length = 36)
    private String invitedBy;

    @Column(name = "expires_at")
    private Instant expiresAt;
}
