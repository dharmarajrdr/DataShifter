package com.datashifter.common.enums;

import java.util.List;

/**
 * All permission constants for the platform (resource:action).
 */
public final class Permissions {
    private Permissions() {}

    public static final String PIPELINE_CREATE = "pipeline:create", PIPELINE_VIEW = "pipeline:view";
    public static final String PIPELINE_EDIT = "pipeline:edit", PIPELINE_COLUMN_MAPPING = "pipeline:column-mapping";
    public static final String PIPELINE_DELETE = "pipeline:delete", PIPELINE_RUN = "pipeline:run";
    public static final String PIPELINE_PAUSE = "pipeline:pause", PIPELINE_STOP = "pipeline:stop";
    public static final String PIPELINE_SETTINGS = "pipeline:settings";

    public static final String WORKFLOW_CREATE = "workflow:create", WORKFLOW_VIEW = "workflow:view";
    public static final String WORKFLOW_EDIT = "workflow:edit", WORKFLOW_DELETE = "workflow:delete";
    public static final String WORKFLOW_RUN = "workflow:run", WORKFLOW_PAUSE = "workflow:pause", WORKFLOW_STOP = "workflow:stop";

    public static final String NAMESPACE_CREATE = "namespace:create", NAMESPACE_EDIT = "namespace:edit", NAMESPACE_DELETE = "namespace:delete";

    public static final String CONNECTION_CREATE = "connection:create", CONNECTION_VIEW = "connection:view";
    public static final String CONNECTION_EDIT = "connection:edit", CONNECTION_DELETE = "connection:delete";
    public static final String CONNECTION_TEST = "connection:test", CONNECTION_BROWSE_SCHEMA = "connection:browse_schema";

    public static final String MONITOR_VIEW = "monitor:view", MONITOR_VIEW_ERRORS = "monitor:view_errors";
    public static final String SETTINGS_EDIT = "settings:edit";

    public static final String UDF_CREATE = "udf:create", UDF_VIEW = "udf:view", UDF_DELETE = "udf:delete";
    public static final String ADAPTER_CREATE = "adapter:create", ADAPTER_VIEW = "adapter:view";
    public static final String ADAPTER_DELETE = "adapter:delete", ADAPTER_PURCHASE = "adapter:purchase";

    public static final String CDC_VIEW = "cdc:view", CDC_MANAGE = "cdc:manage";
    public static final String ORG_MANAGE_MEMBERS = "org:manage_members", ORG_MANAGE_ROLES = "org:manage_roles";
    public static final String ORG_MANAGE_INVITES = "org:manage_invites", ORG_VIEW_AUDIT = "org:view_audit";

    public static final String AGENT_ROLE_NAME = "Agent";

    /** All permissions — for Admin role seed */
    public static final List<String> ALL = List.of(
            PIPELINE_CREATE, PIPELINE_VIEW, PIPELINE_EDIT, PIPELINE_COLUMN_MAPPING, PIPELINE_DELETE,
            PIPELINE_RUN, PIPELINE_PAUSE, PIPELINE_STOP, PIPELINE_SETTINGS,
            WORKFLOW_CREATE, WORKFLOW_VIEW, WORKFLOW_EDIT, WORKFLOW_DELETE, WORKFLOW_RUN, WORKFLOW_PAUSE, WORKFLOW_STOP,
            NAMESPACE_CREATE, NAMESPACE_EDIT, NAMESPACE_DELETE,
            CONNECTION_CREATE, CONNECTION_VIEW, CONNECTION_EDIT, CONNECTION_DELETE, CONNECTION_TEST, CONNECTION_BROWSE_SCHEMA,
            MONITOR_VIEW, MONITOR_VIEW_ERRORS, SETTINGS_EDIT, UDF_CREATE, UDF_VIEW, UDF_DELETE,
            ADAPTER_CREATE, ADAPTER_VIEW, ADAPTER_DELETE, ADAPTER_PURCHASE, CDC_VIEW, CDC_MANAGE,
            ORG_MANAGE_MEMBERS, ORG_MANAGE_ROLES, ORG_MANAGE_INVITES, ORG_VIEW_AUDIT);

    /** Default Agent system role permissions */
    public static final List<String> AGENT = List.of(
            PIPELINE_CREATE, PIPELINE_VIEW, PIPELINE_EDIT, PIPELINE_COLUMN_MAPPING, PIPELINE_DELETE,
            PIPELINE_RUN, PIPELINE_PAUSE, PIPELINE_STOP, PIPELINE_SETTINGS,
            WORKFLOW_CREATE, WORKFLOW_VIEW, WORKFLOW_EDIT, WORKFLOW_DELETE, WORKFLOW_RUN, WORKFLOW_PAUSE, WORKFLOW_STOP,
            NAMESPACE_CREATE, NAMESPACE_EDIT, NAMESPACE_DELETE,
            CONNECTION_CREATE, CONNECTION_VIEW, CONNECTION_EDIT, CONNECTION_DELETE, CONNECTION_TEST, CONNECTION_BROWSE_SCHEMA,
            MONITOR_VIEW, MONITOR_VIEW_ERRORS, SETTINGS_EDIT, UDF_CREATE, UDF_VIEW, UDF_DELETE,
            ADAPTER_CREATE, ADAPTER_VIEW, ADAPTER_DELETE, CDC_VIEW, CDC_MANAGE);

    /** Default Editor permissions */
    public static final List<String> EDITOR = List.of(
            PIPELINE_CREATE, PIPELINE_VIEW, PIPELINE_EDIT, PIPELINE_COLUMN_MAPPING,
            PIPELINE_RUN, PIPELINE_PAUSE, PIPELINE_STOP, PIPELINE_SETTINGS,
            WORKFLOW_CREATE, WORKFLOW_VIEW, WORKFLOW_EDIT, WORKFLOW_RUN, WORKFLOW_PAUSE, WORKFLOW_STOP,
            NAMESPACE_CREATE, NAMESPACE_EDIT,
            CONNECTION_CREATE, CONNECTION_VIEW, CONNECTION_EDIT, CONNECTION_TEST, CONNECTION_BROWSE_SCHEMA,
            MONITOR_VIEW, MONITOR_VIEW_ERRORS, SETTINGS_EDIT, UDF_CREATE, UDF_VIEW, ADAPTER_CREATE, ADAPTER_VIEW,
            CDC_VIEW, CDC_MANAGE);

    /** Default Viewer permissions */
    public static final List<String> VIEWER = List.of(
            PIPELINE_VIEW, WORKFLOW_VIEW, MONITOR_VIEW, MONITOR_VIEW_ERRORS, CONNECTION_VIEW, CONNECTION_BROWSE_SCHEMA,
            UDF_VIEW, ADAPTER_VIEW, CDC_VIEW);
}