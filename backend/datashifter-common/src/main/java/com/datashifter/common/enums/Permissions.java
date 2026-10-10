package com.datashifter.common.enums;

import java.util.List;

/**
 * All permission constants for the platform.
 *
 * Format: resource:action
 *
 * Used by:
 * - Role management (assign permissions to roles)
 * - User permission overrides (grant/revoke per user)
 * - JWT filter (@RequiresPermission annotation)
 * - Frontend (conditionally show/hide UI elements)
 */
public final class Permissions {
        private Permissions() {
        }

        // --- Pipeline ---
        public static final String PIPELINE_CREATE = "pipeline:create";
        public static final String PIPELINE_VIEW = "pipeline:view";
        public static final String PIPELINE_EDIT = "pipeline:edit";
        public static final String PIPELINE_DELETE = "pipeline:delete";
        public static final String PIPELINE_RUN = "pipeline:run";
        public static final String PIPELINE_PAUSE = "pipeline:pause";
        public static final String PIPELINE_STOP = "pipeline:stop";

        // --- Namespace ---
        public static final String NAMESPACE_CREATE = "namespace:create";
        public static final String NAMESPACE_EDIT = "namespace:edit";
        public static final String NAMESPACE_DELETE = "namespace:delete";

        // --- Connection ---
        public static final String CONNECTION_CREATE = "connection:create";
        public static final String CONNECTION_VIEW = "connection:view";
        public static final String CONNECTION_EDIT = "connection:edit";
        public static final String CONNECTION_DELETE = "connection:delete";
        public static final String CONNECTION_TEST = "connection:test";
        public static final String CONNECTION_BROWSE_SCHEMA = "connection:browse_schema";

        // --- Monitor ---
        public static final String MONITOR_VIEW = "monitor:view";
        public static final String MONITOR_VIEW_ERRORS = "monitor:view_errors";

        // --- Settings ---
        public static final String SETTINGS_EDIT = "settings:edit";

        // --- User-defined functions ---
        public static final String UDF_CREATE = "udf:create";
        public static final String UDF_VIEW = "udf:view";
        public static final String UDF_DELETE = "udf:delete";

        // --- Organization ---
        public static final String ORG_MANAGE_MEMBERS = "org:manage_members";
        public static final String ORG_MANAGE_ROLES = "org:manage_roles";
        public static final String ORG_MANAGE_INVITES = "org:manage_invites";
        public static final String ORG_VIEW_AUDIT = "org:view_audit";

        /** All permissions — for Admin role seed */
        public static final List<String> ALL = List.of(
                        PIPELINE_CREATE, PIPELINE_VIEW, PIPELINE_EDIT, PIPELINE_DELETE,
                        PIPELINE_RUN, PIPELINE_PAUSE, PIPELINE_STOP,
                        NAMESPACE_CREATE, NAMESPACE_EDIT, NAMESPACE_DELETE,
                        CONNECTION_CREATE, CONNECTION_VIEW, CONNECTION_EDIT, CONNECTION_DELETE,
                        CONNECTION_TEST, CONNECTION_BROWSE_SCHEMA,
                        MONITOR_VIEW, MONITOR_VIEW_ERRORS,
                        SETTINGS_EDIT,
                        UDF_CREATE, UDF_VIEW, UDF_DELETE,
                        ORG_MANAGE_MEMBERS, ORG_MANAGE_ROLES, ORG_MANAGE_INVITES, ORG_VIEW_AUDIT);

        /** Default Editor permissions */
        public static final List<String> EDITOR = List.of(
                        PIPELINE_CREATE, PIPELINE_VIEW, PIPELINE_EDIT,
                        PIPELINE_RUN, PIPELINE_PAUSE, PIPELINE_STOP,
                        NAMESPACE_CREATE, NAMESPACE_EDIT,
                        CONNECTION_CREATE, CONNECTION_VIEW, CONNECTION_EDIT, CONNECTION_TEST, CONNECTION_BROWSE_SCHEMA,
                        MONITOR_VIEW, MONITOR_VIEW_ERRORS,
                        SETTINGS_EDIT,
                        UDF_CREATE, UDF_VIEW);

        /** Default Viewer permissions */
        public static final List<String> VIEWER = List.of(
                        PIPELINE_VIEW, MONITOR_VIEW, MONITOR_VIEW_ERRORS, CONNECTION_VIEW, CONNECTION_BROWSE_SCHEMA, UDF_VIEW);
}