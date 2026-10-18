package com.datashifter.execution.adapters;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Encapsulates an adapter class loaded by an isolated classloader (<= 100 lines).
 */
@Getter
@RequiredArgsConstructor
public class LoadedAdapterClass {
    private final ClassLoader classLoader;
    private final Class<?> clazz;
}

