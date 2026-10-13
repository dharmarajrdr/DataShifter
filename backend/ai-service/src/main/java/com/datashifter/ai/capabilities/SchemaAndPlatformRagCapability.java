package com.datashifter.ai.capabilities;

import com.datashifter.ai.spi.BeetelCapability;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * Built-in RAG / Knowledge Base capability for DataShifter platform reference,
 * supported database dialects, write modes, and column transformation functions.
 * Can be extended or backed by a Spring AI VectorStore for full document RAG.
 */
@Component
public class SchemaAndPlatformRagCapability implements BeetelCapability {

    @Override
    public String getId() {
        return "datashifter-platform-rag";
    }

    @Override
    public String getDisplayName() {
        return "Platform Knowledge & Transformation RAG";
    }

    @Override
    public List<Object> getToolBeans() {
        return List.of(this);
    }

    @Override
    public String augmentSystemContext(String userQuery, String contextType, String contextId) {
        return """
                ### DataShifter Platform Reference (RAG Knowledge Base)
                - **Supported Database Types (`dbType`)**: `POSTGRESQL`, `MYSQL`, `ORACLE`, `SQL_SERVER`, `SPANNER`
                - **Supported Write Modes (`WriteMode`)**: `INSERT`, `UPSERT`, `REPLACE`, `INSERT_IGNORE`
                - **Supported Column Transformations (`TransformFunction`)**:
                  - String: `TRIM`, `UPPER`, `LOWER`, `SUBSTRING`, `CONCAT`, `REPLACE`, `REGEX_REPLACE`, `LEFT_PAD`, `RIGHT_PAD`
                  - Null/Default: `COALESCE`, `NULL_IF`, `DEFAULT_VALUE`
                  - Type/Date: `TYPE_CAST`, `DATE_FORMAT`, `TIMESTAMP_ADD`, `EXTRACT_YEAR`, `EXTRACT_MONTH`, `EXTRACT_DAY`
                  - Math: `ROUND`, `CEIL`, `FLOOR`, `ABS`, `ADD`, `SUBTRACT`, `MULTIPLY`, `DIVIDE`, `MODULO`
                  - Security/Masking: `MASK_EMAIL`, `MASK_PHONE`, `HASH_SHA256`, `HASH_MD5`
                  - Custom Java UDF: `UDF` (arguments JSON: `{"udfName":"...","className":"...","methodName":"..."}`)
                - **Supported Filter Operators (`FilterOperator`)**: `EQUALS`, `NOT_EQUALS`, `GREATER_THAN`, `LESS_THAN`, `GREATER_THAN_OR_EQUAL`, `LESS_THAN_OR_EQUAL`, `LIKE`, `IN`, `IS_NULL`, `IS_NOT_NULL`, `BETWEEN`
                """;
    }

    @Tool(description = "Search the DataShifter platform knowledge base (RAG) for documentation on transformations, write modes, workflow DAG rules, or markdown pipeline specification format.")
    public Map<String, String> searchPlatformKnowledge(
            @ToolParam(description = "Topic or keyword to search in the DataShifter knowledge base (e.g. 'transformations', 'workflows', 'markdown-spec', 'debugging')") String topic) {
        String normalized = topic == null ? "" : topic.toLowerCase();
        if (normalized.contains("workflow") || normalized.contains("dag")) {
            return Map.of(
                    "topic", "Workflows & DAG Rules",
                    "documentation", "A Workflow orchestrates multiple VALIDATED pipelines in a single connected chain (DAG). Each pipeline can belong to at most one workflow. Nodes represent pipelines and directed edges (sourcePipelineId -> targetPipelineId) define execution order and failure actions (STOP_WORKFLOW, STOP_PIPELINE, CONTINUE_PIPELINE)."
            );
        }
        if (normalized.contains("markdown") || normalized.contains("spec")) {
            return Map.of(
                    "topic", "Markdown Pipeline & Workflow Specification",
                    "documentation", "Markdown specifications can define Source Connection, Target Connection, Table Pairs (source_table -> target_table), Write Mode (INSERT/UPSERT/REPLACE/INSERT_IGNORE), Column Mappings, Transformations, Row Filters, and Workflow DAG stages. If connection credentials/names or table names are missing, Beetel must ask the user before generating the execution plan."
            );
        }
        return Map.of(
                "topic", "DataShifter General & Transformations",
                "documentation", augmentSystemContext(topic, null, null)
        );
    }
}
