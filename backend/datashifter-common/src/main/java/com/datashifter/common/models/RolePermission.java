package com.datashifter.common.models;

import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name = "role_permissions", uniqueConstraints = @UniqueConstraint(columnNames = {"role_id", "permission"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RolePermission extends BaseEntity {

    @Column(name = "role_id", nullable = false, length = 36)
    private String roleId;

    @Column(nullable = false, length = 100)
    private String permission;
}
