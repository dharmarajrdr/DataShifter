package com.datashifter.connector.services.implementations;

import com.datashifter.common.dtos.ConnectionDtos.ForeignKeyMetadata;
import com.datashifter.common.dtos.TableOrderDtos.*;
import com.datashifter.common.exceptions.ResourceNotFoundException;
import com.datashifter.common.models.Connection;
import com.datashifter.common.utils.EncryptionUtil;
import com.datashifter.connector.factories.ConnectorFactory;
import com.datashifter.connector.repositories.ConnectionRepository;
import com.datashifter.connector.spi.interfaces.ConnectionConfig;
import com.datashifter.connector.spi.interfaces.DatabaseConnector;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for FK-based table dependency ordering.
 *
 * Two modes:
 *   1. Smart Order — auto-detect FKs and return topologically sorted order
 *   2. Validate Order — check a user-provided order for FK violations
 *
 * Called by:
 *   - Frontend "Smart order" button → via ConnectionController endpoint
 *   - Pipeline validation step (before execution starts)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TableOrderService {

    private final ConnectionRepository connectionRepository;
    private final ConnectorFactory connectorFactory;

    /**
     * Auto-detect FK dependencies and return topologically sorted table order.
     * Parents (referenced tables) come before children (FK tables).
     */
    @Transactional(readOnly = true)
    public SmartOrderResponse smartOrder(SmartOrderRequest request) {
        Connection conn = connectionRepository.findById(request.getConnectionId())
                .orElseThrow(() -> new ResourceNotFoundException("Connection", request.getConnectionId()));
        DatabaseConnector connector = connectorFactory.getConnector(conn.getDbType());
        ConnectionConfig config = buildConfig(conn);

        Set<String> requestedTables = new HashSet<>(request.getTableNames());
        List<DependencyEdge> allEdges = new ArrayList<>();
        List<OrderWarning> warnings = new ArrayList<>();

        // Build adjacency map: child → parents (only within the requested table set)
        Map<String, Set<String>> dependsOn = new LinkedHashMap<>();
        for (String table : request.getTableNames()) {
            dependsOn.putIfAbsent(table, new LinkedHashSet<>());
        }

        for (String table : request.getTableNames()) {
            try {
                List<ForeignKeyMetadata> fks = connector.getForeignKeys(config, table);
                for (ForeignKeyMetadata fk : fks) {
                    String parent = fk.getReferencedTable();

                    allEdges.add(DependencyEdge.builder()
                            .childTable(table)
                            .parentTable(parent)
                            .fkColumn(fk.getColumnName())
                            .referencedColumn(fk.getReferencedColumn())
                            .constraintName(fk.getConstraintName())
                            .build());

                    // Only add to graph if parent is also in the requested set
                    if (requestedTables.contains(parent)) {
                        dependsOn.get(table).add(parent);
                        dependsOn.putIfAbsent(parent, new LinkedHashSet<>());
                    } else {
                        warnings.add(OrderWarning.builder()
                                .childTable(table).parentTable(parent)
                                .message(String.format("%s references %s (FK: %s) but %s is not in the pipeline. Ensure it exists in target before migrating %s.",
                                        table, parent, fk.getConstraintName(), parent, table))
                                .severity("INFO")
                                .build());
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to fetch FKs for {}: {}", table, e.getMessage());
                warnings.add(OrderWarning.builder()
                        .childTable(table)
                        .message("Could not fetch FK metadata: " + e.getMessage())
                        .severity("WARNING")
                        .build());
            }
        }

        // Topological sort (Kahn's algorithm)
        TopologicalSortResult sortResult = topologicalSort(dependsOn, request.getTableNames());

        if (sortResult.hasCycle) {
            warnings.add(OrderWarning.builder()
                    .message("Circular FK dependencies detected between: " + String.join(", ", sortResult.cycleNodes)
                            + ". These tables may need a two-pass migration (insert with NULLs, then update FKs).")
                    .severity("ERROR")
                    .build());
        }

        log.info("Smart order for {} tables: {} dependencies, {} warnings, cycle={}",
                request.getTableNames().size(), allEdges.size(), warnings.size(), sortResult.hasCycle);

        return SmartOrderResponse.builder()
                .orderedTables(sortResult.sorted)
                .dependencies(allEdges)
                .warnings(warnings)
                .hasCycle(sortResult.hasCycle)
                .cycleNodes(sortResult.cycleNodes)
                .build();
    }

    /**
     * Validate a user-provided table order against FK dependencies.
     * Returns warnings for any child-before-parent violations.
     */
    @Transactional(readOnly = true)
    public ValidateOrderResponse validateOrder(ValidateOrderRequest request) {
        Connection conn = connectionRepository.findById(request.getConnectionId())
                .orElseThrow(() -> new ResourceNotFoundException("Connection", request.getConnectionId()));
        DatabaseConnector connector = connectorFactory.getConnector(conn.getDbType());
        ConnectionConfig config = buildConfig(conn);

        Set<String> tableSet = new HashSet<>(request.getTableNames());
        Map<String, Integer> positionMap = new HashMap<>();
        for (int i = 0; i < request.getTableNames().size(); i++) {
            positionMap.put(request.getTableNames().get(i), i);
        }

        List<OrderWarning> warnings = new ArrayList<>();

        for (String table : request.getTableNames()) {
            try {
                List<ForeignKeyMetadata> fks = connector.getForeignKeys(config, table);
                for (ForeignKeyMetadata fk : fks) {
                    String parent = fk.getReferencedTable();
                    if (!tableSet.contains(parent)) continue; // parent not in pipeline

                    Integer childPos = positionMap.get(table);
                    Integer parentPos = positionMap.get(parent);

                    if (childPos != null && parentPos != null && childPos < parentPos) {
                        warnings.add(OrderWarning.builder()
                                .childTable(table).parentTable(parent)
                                .message(String.format(
                                        "%s (position %d) depends on %s (position %d) via FK %s — move %s before %s",
                                        table, childPos + 1, parent, parentPos + 1,
                                        fk.getConstraintName(), parent, table))
                                .severity("WARNING")
                                .build());
                    }
                }
            } catch (Exception e) {
                log.warn("FK validation failed for {}: {}", table, e.getMessage());
            }
        }

        return ValidateOrderResponse.builder()
                .valid(warnings.isEmpty())
                .warnings(warnings)
                .build();
    }

    // =========================================================================
    // TOPOLOGICAL SORT — Kahn's algorithm
    // =========================================================================

    private TopologicalSortResult topologicalSort(Map<String, Set<String>> dependsOn, List<String> allTables) {
        // Compute in-degrees
        Map<String, Integer> inDegree = new LinkedHashMap<>();
        Map<String, Set<String>> dependedBy = new LinkedHashMap<>();

        for (String table : allTables) {
            inDegree.putIfAbsent(table, 0);
            dependedBy.putIfAbsent(table, new LinkedHashSet<>());
        }

        for (Map.Entry<String, Set<String>> entry : dependsOn.entrySet()) {
            String child = entry.getKey();
            for (String parent : entry.getValue()) {
                inDegree.merge(child, 1, Integer::sum);
                dependedBy.computeIfAbsent(parent, k -> new LinkedHashSet<>()).add(child);
            }
        }

        // Start with zero-degree nodes (no dependencies)
        Queue<String> queue = new LinkedList<>();
        for (String table : allTables) {
            if (inDegree.getOrDefault(table, 0) == 0) {
                queue.add(table);
            }
        }

        List<String> sorted = new ArrayList<>();
        while (!queue.isEmpty()) {
            String node = queue.poll();
            sorted.add(node);
            for (String child : dependedBy.getOrDefault(node, Set.of())) {
                int newDegree = inDegree.get(child) - 1;
                inDegree.put(child, newDegree);
                if (newDegree == 0) queue.add(child);
            }
        }

        boolean hasCycle = sorted.size() < allTables.size();
        List<String> cycleNodes = hasCycle
                ? allTables.stream().filter(t -> !sorted.contains(t)).collect(Collectors.toList())
                : List.of();

        // Append cycle nodes at the end (user can decide how to handle)
        if (hasCycle) {
            sorted.addAll(cycleNodes);
        }

        return new TopologicalSortResult(sorted, hasCycle, cycleNodes);
    }

    private record TopologicalSortResult(List<String> sorted, boolean hasCycle, List<String> cycleNodes) {}

    // =========================================================================
    // HELPERS
    // =========================================================================

    private ConnectionConfig buildConfig(Connection conn) {
        return ConnectionConfig.builder()
                .connectionId(conn.getId())
                .dbType(conn.getDbType())
                .host(conn.getHost())
                .port(conn.getPort())
                .databaseName(conn.getDatabaseName())
                .schemaName(conn.getSchemaName())
                .username(conn.getUsername())
                .password(EncryptionUtil.decrypt(conn.getEncryptedPassword()))
                .build();
    }
}