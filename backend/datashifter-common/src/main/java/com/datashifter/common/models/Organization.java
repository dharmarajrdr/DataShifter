package com.datashifter.common.models;

import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name = "organizations")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Organization extends BaseEntity {

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false, unique = true, length = 100)
    private String slug;

    @Lob
    @Column(name = "logo_url")
    private String logoUrl;

    @ManyToOne
    private Account createdBy;
}
