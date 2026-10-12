package com.datashifter.ai.spi;

import com.datashifter.common.enums.AiContextType;

/**
 * Extensible context advisor SPI for Beetel AI.
 *
 * Implementations enrich the prompt with live entity state (e.g. active Pipeline,
 * active Workflow, or retrieved RAG documentation passages) prior to LLM invocation.
 */
public interface BeetelContextAdvisor {

    /**
     * Execution order (lower runs first).
     */
    default int getOrder() {
        return 100;
    }

    /**
     * Build contextual markdown block to inject into Beetel's system prompt.
     */
    String buildContextSection(String userMessage, AiContextType contextType, String contextId);
}
