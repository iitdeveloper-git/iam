# GNS IAM Role-Based Access Control (RBAC) Specification

This document defines the roles, permissions, and bootstrap instructions for the **GNS (Notification Service)** application.

## 1. Permissions Catalogue

The GNS application is configured with 13 granular permissions:

| Permission Key | Description |
|---|---|
| `gns.dashboard.view` | View the GNS metrics/dashboard |
| `gns.templates.view` | View GNS templates |
| `gns.templates.create` | Create new templates |
| `gns.templates.update` | Update existing templates |
| `gns.templates.delete` | Delete templates |
| `gns.notifications.send` | Send notifications via GNS endpoints |
| `gns.deliveries.view` | View notification delivery records |
| `gns.deliveries.retry` | Trigger delivery retry |
| `gns.providers.view` | View SMTP/SMS provider configurations |
| `gns.providers.manage` | Manage SMTP/SMS providers |
| `gns.api_keys.view` | View API keys |
| `gns.api_keys.manage` | Create or delete API keys |
| `gns.audit.view` | View GNS-specific audit trails |

---

## 2. Roles Definition

The GNS application features 4 standard roles:

### 2.1 GNS Admin (`gns_admin`)
- **Description**: Full administrative control over GNS.
- **Assigned Permissions**: All 13 permissions.

### 2.2 GNS Operator (`gns_operator`)
- **Description**: Operates notifications, deliveries, templates, and provider management.
- **Assigned Permissions**:
  - `gns.dashboard.view`
  - `gns.templates.view`, `gns.templates.create`, `gns.templates.update`, `gns.templates.delete`
  - `gns.notifications.send`
  - `gns.deliveries.view`, `gns.deliveries.retry`
  - `gns.providers.view`, `gns.providers.manage`
  - `gns.api_keys.view`
  - `gns.audit.view`

### 2.3 GNS Developer (`gns_developer`)
- **Description**: Configures templates, integrates API keys, and triggers notifications.
- **Assigned Permissions**:
  - `gns.dashboard.view`
  - `gns.templates.view`, `gns.templates.create`, `gns.templates.update`, `gns.templates.delete`
  - `gns.notifications.send`
  - `gns.deliveries.view`
  - `gns.providers.view`
  - `gns.api_keys.view`, `gns.api_keys.manage`
  - `gns.audit.view`

### 2.4 GNS Viewer (`gns_viewer`)
- **Description**: Read-only observation of notifications, dashboards, and audit logs.
- **Assigned Permissions**:
  - `gns.dashboard.view`
  - `gns.templates.view`
  - `gns.deliveries.view`
  - `gns.providers.view`
  - `gns.api_keys.view`
  - `gns.audit.view`

---

## 3. Bootstrapping Instructions

To register the GNS permissions, roles, and mapping matrices in the database, execute the following CLI command:

```bash
# From the backend directory
python -m iitd_iam.cli bootstrap-gns-rbac
```

### Constraints:
1. The bootstrap process checks if the GNS application (represented by the key `gns-notification-service`) exists in the database. If it is missing, the command fails with exit code `1`.
2. The bootstrap command runs atomically inside a single transaction and is safe to execute multiple times (completely idempotent).
