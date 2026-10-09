package com.datashifter.execution.contexts;

public final class TransformationExecutionContextHolder {
    private static final ThreadLocal<TransformationExecutionContext> CONTEXT = new ThreadLocal<>();

    private TransformationExecutionContextHolder() {}

    public static void set(TransformationExecutionContext context) {
        CONTEXT.set(context);
    }

    public static TransformationExecutionContext get() {
        return CONTEXT.get();
    }

    public static void clear() {
        CONTEXT.remove();
    }
}
