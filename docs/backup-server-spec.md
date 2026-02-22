# Backup API — Server Implementation Spec

The ATXP CLI (`v1.11.0+`) ships a `backup` command that pushes/pulls `.md` files to the accounts server. This document describes the three endpoints the server needs to implement.

## Base URL

The CLI derives the base URL from the user's `ATXP_CONNECTION` string:

```
ATXP_CONNECTION=https://accounts.atxp.ai?connection_token=abc123
                 ^^^^^^^^^^^^^^^^^^^^^^^^
                 base URL = https://accounts.atxp.ai
```

All endpoints are under this base URL.

## Authentication

Every request includes a `Bearer` token extracted from the `connection_token` query parameter of the connection string:

```
Authorization: Bearer <connection_token>
```

The server should resolve this token to the owning account/agent and scope all backup data to that identity. Return `401` if the token is invalid or missing.

## Endpoints

### 1. Push backup

Replaces the entire server-side snapshot for the authenticated user.

```
PUT /backup/files
```

**Request:**

```
Content-Type: application/json
Authorization: Bearer <token>
```

```json
{
  "files": [
    { "path": "SOUL.md", "content": "# My Soul\n..." },
    { "path": "memory/session-1.md", "content": "..." }
  ]
}
```

- `files[].path` — relative path (forward slashes, no leading `/`). May include subdirectories.
- `files[].content` — full UTF-8 file content.
- The entire `files` array replaces whatever was stored previously (latest-snapshot-only semantics).

**Response (200):**

```json
{
  "fileCount": 2,
  "syncedAt": "2026-02-21T12:00:00.000Z"
}
```

- `fileCount` — number of files stored.
- `syncedAt` — ISO 8601 timestamp of when the snapshot was saved.

**Error (4xx/5xx):**

```json
{ "error": "Human-readable error message" }
```

---

### 2. Pull backup

Returns all files from the latest snapshot.

```
GET /backup/files
```

**Request:**

```
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "files": [
    { "path": "SOUL.md", "content": "# My Soul\n..." },
    { "path": "memory/session-1.md", "content": "..." }
  ]
}
```

If no backup exists, return an empty array:

```json
{ "files": [] }
```

---

### 3. Backup status

Returns metadata about the current snapshot without transferring file contents.

```
GET /backup/status
```

**Request:**

```
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "fileCount": 2,
  "syncedAt": "2026-02-21T12:00:00.000Z",
  "totalBytes": 4096
}
```

- `fileCount` — number of files in the snapshot (0 if no backup exists).
- `syncedAt` — ISO 8601 timestamp of the last push.
- `totalBytes` — total size of all file contents in bytes.

## Storage considerations

- **Scope:** one snapshot per authenticated identity (account or agent). Each push fully replaces the previous snapshot.
- **File types:** the CLI only sends `.md` files, but the server doesn't need to enforce this — it stores whatever the client sends.
- **Size limits:** the server should enforce reasonable limits (e.g., max 100 files, max 10 MB total) and return `413` with an `error` message if exceeded.
- **Path safety:** validate that `files[].path` values are relative (no leading `/`, no `..` traversal) before storing.
