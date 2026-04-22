package com.datashifter.execution.parallel;

import lombok.Builder;
import lombok.Getter;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Directed graph with topological sort for table dependency ordering.
 *
 * Nodes = table names.
 * Edges = FK dependencies (child → parent means "child depends on parent").
 *
 * Topological sort guarantees: parent tables come before child tables.
 *
 * Uses Kahn's algorithm:
 *   1. Compute in-degree for every node
 *   2. Start with nodes that have in-degree 0 (no dependencies)
 *   3. Process each, removing outgoing edges, and enqueue newly zero-degree nodes
 *   4. If all nodes processed → valid order. If not → cycle detected.
 */
public class DependencyGraph {

    /** Adjacency list: node → set of nodes it depends on (parents) */
    private final Map<String, Set<String>> dependsOn = new LinkedHashMap<>();

    /** Reverse: node → set of nodes that depend on it (children) */
    private final Map<String, Set<String>> dependedBy = new LinkedHashMap<>();

    /** All edges as pairs */
    private final List<Edge> edges = new ArrayList<>();

    /**
     * Add a node (table) to the graph. Safe to call multiple times.
     */
    public void addNode(String node) {
        dependsOn.putIfAbsent(node, new LinkedHashSet<>());
        dependedBy.putIfAbsent(node, new LinkedHashSet<>());
    }

    /**
     * Add a dependency edge: child depends on parent.
     * Meaning: parent must be processed BEFORE child.
     *
     * @param child  the dependent table (has the FK column)
     * @param parent the referenced table (has the PK)
     */
    public void addDependency(String child, String parent) {
        addNode(child);
        addNode(parent);
        dependsOn.get(child).add(parent);
        dependedBy.get(parent).add(child);
        edges.add(new Edge(child, parent));
    }

    /**
     * Perform topological sort — returns tables in dependency-safe order.
     * Parents before children.
     */
    public SortResult sort() {
        // Compute in-degrees (number of dependencies for each node)
        Map<String, Integer> inDegree = new LinkedHashMap<>();
        for (String node : dependsOn.keySet()) {
            inDegree.put(node, dependsOn.get(node).size());
        }

        // Start with zero-dependency nodes
        Queue<String> queue = new LinkedList<>();
        for (Map.Entry<String, Integer> entry : inDegree.entrySet()) {
            if (entry.getValue() == 0) {
                queue.add(entry.getKey());
            }
        }

        List<String> sorted = new ArrayList<>();
        while (!queue.isEmpty()) {
            String node = queue.poll();
            sorted.add(node);

            // For each node that depends on this one, reduce in-degree
            for (String child : dependedBy.getOrDefault(node, Set.of())) {
                int newDegree = inDegree.get(child) - 1;
                inDegree.put(child, newDegree);
                if (newDegree == 0) {
                    queue.add(child);
                }
            }
        }

        // If not all nodes sorted → cycle exists
        boolean hasCycle = sorted.size() < dependsOn.size();
        List<String> cycleNodes = new ArrayList<>();
        if (hasCycle) {
            cycleNodes = inDegree.entrySet().stream()
                    .filter(e -> e.getValue() > 0)
                    .map(Map.Entry::getKey)
                    .collect(Collectors.toList());
        }

        return SortResult.builder()
                .sortedTables(sorted)
                .hasCycle(hasCycle)
                .cycleNodes(cycleNodes)
                .edges(new ArrayList<>(edges))
                .build();
    }

    /**
     * Validate a user-provided order against the dependency graph.
     * Returns warnings for any FK violations (child before parent).
     */
    public List<OrderWarning> validateOrder(List<String> userOrder) {
        List<OrderWarning> warnings = new ArrayList<>();
        Map<String, Integer> positionMap = new HashMap<>();
        for (int i = 0; i < userOrder.size(); i++) {
            positionMap.put(userOrder.get(i), i);
        }

        for (Edge edge : edges) {
            Integer childPos = positionMap.get(edge.child);
            Integer parentPos = positionMap.get(edge.parent);
            if (childPos == null || parentPos == null) continue; // table not in user's list

            if (childPos < parentPos) {
                warnings.add(OrderWarning.builder()
                        .childTable(edge.child)
                        .parentTable(edge.parent)
                        .message(String.format(
                                "%s (position %d) depends on %s (position %d) via FK — %s should come first",
                                edge.child, childPos + 1, edge.parent, parentPos + 1, edge.parent))
                        .severity(OrderWarning.Severity.WARNING)
                        .build());
            }
        }

        return warnings;
    }

    /**
     * Get all direct dependencies of a table (tables it depends on).
     */
    public Set<String> getDependencies(String table) {
        return Collections.unmodifiableSet(dependsOn.getOrDefault(table, Set.of()));
    }

    /**
     * Get all tables that depend on a given table.
     */
    public Set<String> getDependents(String table) {
        return Collections.unmodifiableSet(dependedBy.getOrDefault(table, Set.of()));
    }

    public List<Edge> getEdges() {
        return Collections.unmodifiableList(edges);
    }

    public int getNodeCount() {
        return dependsOn.size();
    }

    // =========================================================================
    // DATA CLASSES
    // =========================================================================

    public record Edge(String child, String parent) {}

    @Getter @Builder
    public static class SortResult {
        private final List<String> sortedTables;
        private final boolean hasCycle;
        private final List<String> cycleNodes;
        private final List<Edge> edges;
    }

    @Getter @Builder
    public static class OrderWarning {
        private final String childTable;
        private final String parentTable;
        private final String message;
        private final Severity severity;

        public enum Severity { INFO, WARNING, ERROR }
    }
}