package com.datashifter.common.models;

import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name = "user_permissions", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "permission"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UserPermission extends BaseEntity {

    @Column(name = "user_id", nullable = false, length = 36)
    private String userId;

    @Column(nullable = false, length = 100)
    private String permission;

    /** GRANT or REVOKE */
    @Column(nullable = false, length = 10)
    private String type;
}
