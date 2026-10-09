package com.datashifter.common.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "udf_functions", indexes = {
        @Index(name = "idx_udf_functions_definition", columnList = "udf_definition_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UdfFunction extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "udf_definition_id", nullable = false)
    private UdfDefinition udfDefinition;

    @Column(name = "class_name", nullable = false, length = 500)
    private String className;

    @Column(name = "method_name", nullable = false, length = 255)
    private String methodName;

    @Column(name = "function_name", nullable = false, length = 255)
    private String functionName;

    @Column(length = 1000)
    private String description;

    @Lob
    @Column(name = "parameter_types", nullable = false)
    private String parameterTypes;

    @Column(name = "return_type", nullable = false, length = 500)
    private String returnType;

    @Column(name = "static_method", nullable = false)
    private boolean staticMethod;
}