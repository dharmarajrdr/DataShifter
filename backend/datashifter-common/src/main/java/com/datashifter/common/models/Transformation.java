package com.datashifter.common.models;

import com.datashifter.common.enums.TransformFunction;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "transformations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Transformation extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "column_mapping_id", nullable = false)
    private ColumnMapping columnMapping;

    @Enumerated(EnumType.STRING)
    @Column(name = "function_name", nullable = false, length = 30)
    private TransformFunction functionName;

    /** Function arguments as JSON string, e.g. "'yyyy-MM-dd'" for TO_DATE */
    @Lob
    @Column(name = "arguments")
    private String arguments;

    @Column(name = "execution_order", nullable = false)
    private Integer executionOrder;
}
