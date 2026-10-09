package com.datashifter.execution.strategies.transformers;

import com.datashifter.common.enums.UdfFailurePolicy;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class UdfConfig {
    private String udfId;
    private String udfName;
    private String version;
    private String className;
    private String methodName;
    private List<String> inputColumns;
    @Builder.Default
    private UdfFailurePolicy failurePolicy = UdfFailurePolicy.SKIP_ROW;
    private String defaultValue;
    private String storageKey;
}
