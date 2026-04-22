# Organization

DataShifter is multi-tenant. Each organization is an isolated workspace with its own pipelines, connections, namespaces, and members.

## Organization info

View and edit your org name from **Settings → Organization**.

## Members

Members are users within your organization. Each member has a role that determines their permissions.

### Default roles

| Role | Description | Key permissions |
|------|-------------|-----------------|
| **Admin** | Full access | Everything including member/role management |
| **Editor** | Build and run | Create/edit pipelines, connections, run migrations |
| **Viewer** | Read only | View pipelines, monitor, errors (no modifications) |

### Inviting members

Admins can invite new members by email. The invite includes a role assignment. Invitees receive the link and can sign up or (if they already have an account) accept from the notification bell.

### Managing members

- Change a member's role via the dropdown on the members list
- Deactivate a member to revoke access without deleting
- Search members by name (useful for large organizations)

## Multi-org support

A single account (email) can be a member of multiple organizations. Switch between orgs using the org switcher in the sidebar — no re-login required.

Each org has completely isolated data. Pipelines, connections, and namespaces created in one org are invisible to other orgs.

## Custom roles

Create custom roles with specific permission sets via **Settings → Manage roles**. Assign any combination of:

- Pipeline permissions (create, edit, delete, run, pause, stop)
- Connection permissions (create, edit, delete, test, browse)
- Monitor permissions (view, view errors)
- Org permissions (manage members, manage roles, manage invites)
