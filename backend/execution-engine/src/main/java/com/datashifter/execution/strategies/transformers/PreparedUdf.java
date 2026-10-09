package com.datashifter.execution.strategies.transformers;

import com.datashifter.common.enums.UdfFailurePolicy;
import lombok.Getter;

import java.lang.reflect.Method;

/**
 * Pre-compiled, cached metadata for a specific UDF invocation.
 * Eliminates redundant JSON parsing, class/method lookups, and reflection inspection on the hot path.
 */
@Getter
public class PreparedUdf {

    private final UdfConfig config;
    private final UdfExecutionManager.LoadedUdfClass loadedClass;
    private final Method method;
    private final boolean voidReturn;
    private final UdfFailurePolicy failurePolicy;
    private final Object defaultValue;

    public PreparedUdf(UdfConfig config,
                       UdfExecutionManager.LoadedUdfClass loadedClass,
                       Method method) {
        this.config = config;
        this.loadedClass = loadedClass;
        this.method = method;
        this.voidReturn = (method.getReturnType() == void.class || method.getReturnType() == Void.class);
        this.failurePolicy = config.getFailurePolicy() != null
                ? config.getFailurePolicy()
                : UdfFailurePolicy.SKIP_ROW;
        this.defaultValue = config.getDefaultValue();
    }

    public Object getInstance() {
        return loadedClass.getInstance();
    }
}
