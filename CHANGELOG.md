# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added
- **IAM-003**: End-to-end atomic invitation acceptance flow (`POST /invitations/accept`).
- Added robust scoped APIs for role management (`GET /roles`, `POST /applications/{id}/roles`, etc.).
- Soft lifecycle management for applications (`suspended` and `archived` states via `PATCH /applications/{id}`).
- Added 25 new comprehensive tests covering role assignments and the complete invitation lifecycle.
- Introduced `AssignmentSource` enum (`invitation`, `manual`, `system`) to `UserRoleAssignment`.

### Changed
- Refactored `UserRoleAssignment` uniqueness constraint into two partial unique indexes (platform vs application-scoped) for cross-database consistency (SQLite and PostgreSQL).
- Invitation acceptance tokens are now safely passed in the request body instead of the URL path to prevent leakage in access logs.

### Fixed
- Fixed an issue where the test suite would fail on collection due to missing `IAM_DATABASE_URL` by implementing a robust `conftest.py` setup.
