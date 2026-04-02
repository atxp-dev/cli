---
name: atxp-git
description: Git repository hosting for ATXP-authenticated agents — create repos, get authenticated clone/push URLs, and manage repositories on code.storage
compatibility: Requires Node.js >=18 and npx. Requires git for clone/push operations.
tags: [git, repository, hosting, code-storage, version-control, source-code, agent-code]
permissions:
  - network: "git.mcp.atxp.ai (HTTPS only), *.atxp.code.storage (Git over HTTPS)"
  - filesystem: "Cloned repositories are written to the local filesystem by git"
  - credentials: "ATXP_CONNECTION (required for all operations)"
metadata:
  homepage: https://docs.atxp.ai
  source: https://github.com/atxp-dev/cli
  npm: https://www.npmjs.com/package/atxp
  requires:
    binaries: [node, npx, git]
    node: ">=18"
    env:
      - name: ATXP_CONNECTION
        description: Authentication token for the ATXP API. Required for all git operations.
        required: true
---

# ATXP Git — Agent Repository Hosting

ATXP Git gives each agent a private namespace for Git repositories on [code.storage](https://code.storage). Agents can create repos, get authenticated clone/push URLs, and interact with them using standard Git commands. The MCP server handles provisioning and access control — all file operations happen through native Git.

## Ephemeral Remote URLs

**This is the most important concept to understand when using this tool.**

Remote URLs returned by `remote-url` contain a **time-limited JWT** embedded directly in the URL. This means:

1. **URLs expire.** The default TTL is 1 hour (3600 seconds). After expiry, any `git clone`, `git push`, `git pull`, or `git fetch` using that URL will fail with an authentication error.
2. **URLs are not persistent.** Do **not** store remote URLs in config files, environment variables, or long-lived scripts expecting them to work indefinitely. They are single-use credentials with a short lifespan.
3. **Refresh when expired.** When a git operation fails with an auth error, get a fresh URL and update the remote:

```bash
# Get a new writable URL
npx atxp@latest git remote-url my-project --writable

# Update the existing remote with the new URL
git remote set-url origin <new-url>

# Retry the operation
git push
```

4. **No separate credential setup needed.** The URL embeds authentication — no `git credential` helper or SSH key configuration is required.
5. **Read vs. write URLs.** Read-only URLs are free. Writable URLs cost $0.01 (this meters storage growth from pushes). Always request read-only unless you need to push.

### Practical Workflow for Long-Running Tasks

If your task involves multiple git operations over time:

```
1. Get a writable URL at the start of your work session
2. Clone and make changes
3. Commit and push before the URL expires (within 1 hour)
4. If you need to push again later, get a fresh URL first
```

For tasks that may span multiple hours, request a new URL before each push rather than at the start. The `--ttl` flag can extend expiry up to the server maximum, but planning for refresh is more robust.

## Security Model

- **Repos are private by default** — only the owner can access them.
- **Public repos** allow read-only access from other authenticated users via `remote-url` with `writable: false`.
- **Write access** requires repo ownership. No collaborator model — repos are single-owner.
- **URLs contain credentials** — treat `remote-url` output like a secret. Do not log, echo, or share writable URLs.
- **Soft-delete** — deleted repos become immediately inaccessible but are permanently removed after 30 days.

## Commands Reference

| Command | Cost | Description |
|---------|------|-------------|
| `npx atxp@latest git create <repoName>` | $0.50 | Create a new repository |
| `npx atxp@latest git list` | Free | List your repositories |
| `npx atxp@latest git remote-url <repoName>` | Free | Get a read-only authenticated URL |
| `npx atxp@latest git remote-url <repoName> --writable` | $0.01 | Get a writable authenticated URL |
| `npx atxp@latest git delete <repoName>` | Free | Soft-delete a repository |
| `npx atxp@latest git help` | Free | Show help |

### Options

| Option | Applies To | Description |
|--------|-----------|-------------|
| `--visibility <private\|public>` | create | Repository visibility (default: private) |
| `--default-branch <name>` | create | Default branch name (default: main) |
| `--writable` | remote-url | Request a push-capable URL ($0.01 instead of free) |
| `--ttl <seconds>` | remote-url | URL expiry in seconds (default: 3600) |
| `--limit <n>` | list | Max repos to return (default: 20, max: 100) |
| `--cursor <token>` | list | Pagination cursor from a previous response |

### Repo Naming

Repository names must be lowercase alphanumeric with hyphens and underscores only (e.g., `my-project`, `agent_workspace`).

## Typical Agent Workflow

```bash
# 1. Create a repository ($0.50)
npx atxp@latest git create my-app

# 2. Get a writable URL ($0.01)
npx atxp@latest git remote-url my-app --writable
# Returns: https://t:eyJ...@atxp.code.storage/userid/my-app.git

# 3. Clone, work, push (standard git)
git clone <url>
cd my-app
# ... make changes ...
git add . && git commit -m "initial commit" && git push

# 4. Later — URL expired? Get a fresh one
npx atxp@latest git remote-url my-app --writable
git remote set-url origin <new-url>
git push
```

## Error Responses

| Scenario | Error message |
|----------|---------------|
| Not authenticated | `"ATXP authentication required"` |
| Repo doesn't exist (or private + not owner) | `"Repository not found"` |
| Write to another user's repo | `"Permission denied"` |
| Repo name already taken | `"Repository already exists"` |
| Service unavailable | `"Service temporarily unavailable. Please retry in a few seconds."` |
| Git ref conflict | `"Conflict: ... Re-read the current state and retry."` |

## Visibility

| Mode | Owner | Other authenticated users |
|------|-------|---------------------------|
| **Private** | Full read/write | No access |
| **Public** | Full read/write | Read-only (via `remote-url` with read-only default) |

## Rate Limits

- **Per-client:** 120 requests/minute
- **Per-IP:** 10,000 requests/minute

Exceeding limits returns HTTP 429 with a `Retry-After` hint.

