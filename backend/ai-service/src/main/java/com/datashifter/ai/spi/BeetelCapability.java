package com.datashifter.ai.spi;

import java.util.List;

/**
 * Extensible SPI for Beetel AI Agent capabilities.
 *
 * Future capabilities such as VectorStore-backed RAG (Retrieval-Augmented Generation),
 * custom SQL dialect translators, or anomaly detectors implement this interface as a
 * Spring @Component and are automatically discovered and composed into Beetel's runtime.
 */
public interface BeetelCapability {

    /**
     * Unique capability identifier (e.g., "rag-platform-docs", "schema-introspection", "vector-rag").
     */
    String getId();

    /**
     * Human-readable name shown in the Beetel capabilities status badge.
     */
    String getDisplayName();

    /**
     * Whether this capability is currently enabled.
     */
    default boolean isEnabled() {
        return true;
    }

    /**
     * Optional Spring AI @Tool beans contributed by this capability.
     */
    default List<Object> getToolBeans() {
        return List.of();
    }

    /**
     * Optional system prompt augmentation or retrieved RAG knowledge chunks for the given user query.
     */
    default String augmentSystemContext(String userQuery, String contextType, String contextId) {
        return "";
    }
}
