package com.datashifter.execution.strategies.transformers;

import com.datashifter.common.enums.TransformFunction;
import com.datashifter.common.exceptions.DatashifterException;
import com.datashifter.common.models.Transformation;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
public class TransformerFactory {

    private final Map<String, ColumnTransformer> transformerMap;

    public TransformerFactory(List<ColumnTransformer> transformers) {
        this.transformerMap = transformers.stream()
                .collect(Collectors.toMap(ColumnTransformer::getFunctionName, Function.identity()));
    }

    public ColumnTransformer getTransformer(TransformFunction fn) {
        ColumnTransformer t = transformerMap.get(fn.name());
        if (t == null) throw new DatashifterException("No transformer for function: " + fn);
        return t;
    }

    public TransformerChain buildChain(Set<Transformation> transformations) {
        List<TransformerChain.TransformerStep> steps = transformations.stream()
                .map(t -> new TransformerChain.TransformerStep(getTransformer(t.getFunctionName()), t.getArguments()))
                .collect(Collectors.toList());
        return new TransformerChain(steps);
    }
}
