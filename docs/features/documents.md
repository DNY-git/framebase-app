# Feature Spec: Documents

> The Documents domain lets teams upload, organize, and retrieve project files — contracts, drawings, reports, safety bulletins — with tenant-scoped access control and tamper-aware storage.

Companion docs: [../api/endpoints.md](../api/endpoints.md#documents), [../architecture/backend.md → Cross-Cutting Services](../architecture/backend.md#cross-cutting-services), [../security/data-protection.md](../security/data-protection.md), [PROJECT_RULES.md §31](../../PROJECT_RULES.md#31-audit-rules). Roadmap: Phase 3 ([ROADMAP.md](../../ROADMAP.md)).

---

## Table of Contents

- [Overview](#overview)
- [User Stories](#user-stories)
- [Data Model](#data-model)
- [Storage](#storage)
- [Permissions & Roles](#permissions--roles)
- [API Surface](#api-surface)
- [Edge Cases & Rules](#edge-cases--rules)
- [Non-Functional Requirements](#non-functional-requirements)

---

## Overview

Documents live in tenant-scoped collections. Each document record points at a content-addressed blob on disk; the original filename is preserved for display, while the stored file is keyed by its SHA-256 hash. Uploads are streamed to a temporary directory by Multer, then hashed, deduplicated (identical content → shared blob), and moved under the tenant's uploads root. All mutations are recorded in the audit log.

## User Stories

- **As a site engineer**, I can upload drawings or reports for a project and download them later.
- **As a project manager**, I can attach contracts to a project and filter the document list by project.
- **As an admin**, I can delete any document; as any user, I can delete files I uploaded.
- **As a viewer**, I can browse and download documents but may not upload or delete.
- **As a compliance officer**, I can see who uploaded, downloaded, and deleted what via the audit log.

## Data Model

Collection `documents` (see [../database/schema.md](../database/schema.md)):

| Field | Type | Notes |
| --- | --- | --- |
| `id` | ObjectId (string) | Identifier |
| `tenantId` | string | Scoped to tenant |
| `name` | string | Sanitized display name (basename; max 200 chars) |
| `mimeType` | string | Reported MIME type (default `application/octet-stream`) |
| `sizeBytes` | number | Size in bytes |
| `fileHash` | string | SHA-256 of file content |
| `storageKey` | string | Content address (== `fileHash`) under the tenant root |
| `projectId?` | string | Optional project association |
| `uploadedBy` | string | User ID who uploaded |
| `createdAt` / `updatedAt` | Date | Timestamps |

Indexes: `tenantId + projectId`, `tenantId + name`.

## Storage

- Root: `<cwd>/storage/uploads/<tenantId>/<sha256>` (git-ignored; local filesystem driver, `storage/` in `.gitignore`).
- Content addressed: two uploads of identical bytes share one blob.
- Path traversal is prevented: keys are derived from hashes or sanitised names; `resolve()` validates the resolved path stays under the tenant root.
- Multer uploads land in `storage/uploads/.tmp` before validation; the service rejects requests without a file (`DOCUMENT_EMPTY_FILE`).

## Permissions & Roles

| Action | Allowed |
| --- | --- |
| Upload | any role except `viewer` |
| List / download | any authenticated user in the tenant |
| Delete | the uploader, or any `admin` |

## API Surface

See [../api/endpoints.md → Documents](../api/endpoints.md#documents).

- `POST /documents` — multipart `file` + optional `projectId`. Returns `201` with the created document.
- `GET /documents` — paginated; filters `projectId`, `search` (case-insensitive name match).
- `GET /documents/:id` — single record.
- `GET /documents/:id/download` — streams the file with the original MIME type and an inline `Content-Disposition`. Bypasses the JSON envelope via `@Res().sendFile`.
- `DELETE /documents/:id` — `204`; enforces uploader/admin ownership.

## Edge Cases & Rules

- Empty uploads are rejected with `DOCUMENT_EMPTY_FILE`.
- Missing documents surface `DOCUMENT_NOT_FOUND` (404).
- Deleting the last reference to a blob also removes the stored file; the blob is otherwise kept (dedupe may share it).
- `viewer` attempts to upload/delete are rejected with `FORBIDDEN`.
- Audit events: `document.upload`, `document.delete` with before/after snapshots.

## Non-Functional Requirements

- 25 MB upload cap enforced by Multer; storage failures map to `DOCUMENT_STORAGE_ERROR`.
- Content hashing (SHA-256) gives cheap change detection and dedupe.
- All reads require tenant scoping; `resolve()` confinement prevents path traversal.
- Object storage (S3) is a planned replacement for the local driver; the storage abstraction is injected into the service so controllers stay storage-agnostic.