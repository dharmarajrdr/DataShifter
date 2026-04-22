package com.datashifter.common.utils;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Resolves effective permissions for a user.
 *
 * Formula: effective = rolePermissions + userGrants - userRevokes
 *
 * Example:
 *   Role "Moderator" has: [pipeline:create, pipeline:view, pipeline:run]
 *   User has GRANT: [connection:delete]
 *   User has REVOKE: [pipeline:run]
 *   Effective: [pipeline:create, pipeline:view, connection:delete]
 */
public final class PermissionResolver {
    private PermissionResolver() {}

    public static Set<String> resolve(List<String> rolePermissions,
                                       List<PermissionOverride> userOverrides) {
        Set<String> effective = new HashSet<>(rolePermissions);

        if (userOverrides != null) {
            for (PermissionOverride override : userOverrides) {
                if ("GRANT".equals(override.type())) {
                    effective.add(override.permission());
                } else if ("REVOKE".equals(override.type())) {
                    effective.remove(override.permission());
                }
            }
        }

        return effective;
    }

    public record PermissionOverride(String permission, String type) {}
}