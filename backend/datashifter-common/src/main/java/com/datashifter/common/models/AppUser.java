package com.datashifter.common.models;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity @Table(name = "users")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AppUser extends BaseEntity {

    @Column(name = "full_name", nullable = false, length = 200)
    private String fullName;

    @Column(name = "display_initials", length = 4)
    private String displayInitials;

    @Column(name = "avatar_color", length = 20)
    @Builder.Default
    private String avatarColor = "#534AB7";

    @ManyToOne
    private Account account;

    @ManyToOne
    private Organization organization;

    @ManyToOne
    private Role role;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "last_login_at")
    private Instant lastLoginAt;

    @Column(name = "timezone")
    private String timezone;

    @OneToMany(mappedBy = "userId", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @Builder.Default
    private List<UserPermission> permissionOverrides = new ArrayList<>();
}