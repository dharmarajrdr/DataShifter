package com.datashifter.common.models;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity @Table(name = "roles", uniqueConstraints = @UniqueConstraint(columnNames = {"org_id", "name"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Role extends BaseEntity {

    @Column(name = "org_id", nullable = false, length = 36)
    private String orgId;

    @Column(nullable = false, length = 50)
    private String name;

    @Lob
    @Column
    private String description;

    @Column(name = "is_system")
    @Builder.Default
    private Boolean isSystem = false;

    @OneToMany(mappedBy = "roleId", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @Builder.Default
    private List<RolePermission> permissions = new ArrayList<>();
}
