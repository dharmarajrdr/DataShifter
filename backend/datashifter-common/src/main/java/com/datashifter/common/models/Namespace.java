package com.datashifter.common.models;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "namespaces", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"name"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Namespace extends BaseEntity {

    @Column(nullable = false, length = 100)
    private String name;

    @Lob
    @Column
    private String description;

    /** Color for UI grouping — hex or named color */
    @Column(length = 20)
    @Builder.Default
    private String color = "#534AB7";

    /** Who created this namespace */
    @ManyToOne
    private AppUser createdBy;
}