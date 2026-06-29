# IAM-008 UI Revamp

## Scope

IAM-008 modernizes the admin console frontend while preserving the existing backend API contracts. The revamp focuses on the global shell, dashboard, application registry, and application detail overview.

## Completed UI Changes

- Added a compact enterprise admin shell with grouped sidebar navigation, mobile drawer behavior, sticky top navigation, global search field, notification entry point, and profile menu.
- Removed the large IAM API session/token panel from normal console pages. Session state is represented in the profile menu instead.
- Added reusable UI primitives for page headers, metric cards, status badges, filters, loading states, empty states, and error states.
- Reworked the overview dashboard around real API data for applications, users, invitations, audit events, and system health.
- Reworked the applications page with summary metrics, search, lifecycle filtering, authorization-mode filtering, richer application rows, and the existing registration workflow.
- Reworked the application detail shell and overview with modern header actions, lifecycle controls, tab navigation, real role/access/invitation/audit counts, details, quick actions, and explicit empty states.

## Data Integrity

The UI intentionally avoids fake production metrics. Values are rendered from existing frontend API client calls. Where no verified backend signal exists, such as MFA adoption percentage or detailed application security posture scoring, the console shows an unavailable or explanatory state instead of invented numbers.

## Verification

Frontend verification is tracked in `.agent/TASKS.md` under IAM-008.

- `npm run typecheck`: passed.
- `npm run build`: passed. The sandbox blocks Turbopack worker port binding, so the successful build was run with elevated local execution permissions.
- `npm run lint`: not available in the current Next.js 16 toolchain because the existing `next lint` script is no longer accepted by `next`.
- `npm test`: not available because the frontend package does not define a `test` script.
