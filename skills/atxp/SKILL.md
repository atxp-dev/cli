---
name: atxp
description: Access ATXP paid API tools for web search, AI image generation, music creation, video generation, X/Twitter search, and cloud deployment (Workers, D1, R2). Requires authentication via `npx atxp login`.
---

# ATXP Tools

Access ATXP's paid API tools via CLI.

## Authentication

```bash
# Check if authenticated
echo $ATXP_CONNECTION

# If not set, login:
npx atxp login
source ~/.atxp/config
```

## Commands

| Command | Description |
|---------|-------------|
| `npx atxp search <query>` | Real-time web search |
| `npx atxp image <prompt>` | AI image generation |
| `npx atxp music <prompt>` | AI music generation |
| `npx atxp video <prompt>` | AI video generation |
| `npx atxp x <query>` | X/Twitter search |

## PaaS Tools

Deploy serverless apps with Cloudflare Workers, SQLite databases (D1), and object storage (R2).

### Workers (Serverless Functions)
- `deploy_worker` - Deploy a Cloudflare Worker
- `list_deployments` - List all deployed workers
- `get_logs` - Retrieve worker logs
- `delete_worker` - Delete a worker deployment

### D1 Database (SQLite)
- `create_database` - Create a new D1 database
- `list_databases` - List all databases
- `query` - Execute SQL queries
- `delete_database` - Delete a database

### R2 Storage (Object Storage)
- `create_bucket` - Create a new R2 bucket
- `list_buckets` - List all buckets
- `upload_file` - Upload a file to a bucket
- `get_file` - Retrieve a file from a bucket
- `list_files` - List files in a bucket
- `delete_file` - Delete a file
- `delete_bucket` - Delete a bucket

## Usage

1. Verify `$ATXP_CONNECTION` is set
2. Run the appropriate command
3. Parse and present results

## Programmatic Access

```typescript
import { atxpClient, ATXPAccount } from '@atxp/client';

const client = await atxpClient({
  mcpServer: 'https://search.mcp.atxp.ai',
  account: new ATXPAccount(process.env.ATXP_CONNECTION),
});

const result = await client.callTool({
  name: 'search_search',
  arguments: { query: 'your query' },
});
```

## MCP Servers

| Server | Tools |
|--------|-------|
| `search.mcp.atxp.ai` | `search_search` |
| `image.mcp.atxp.ai` | `image_create_image` |
| `music.mcp.atxp.ai` | `music_create` |
| `video.mcp.atxp.ai` | `create_video` |
| `x-live-search.mcp.atxp.ai` | `x_live_search` |
| `paas.mcp.atxp.ai` | `deploy_worker`, `list_deployments`, `get_logs`, `delete_worker`, `create_database`, `list_databases`, `query`, `delete_database`, `create_bucket`, `list_buckets`, `delete_bucket`, `upload_file`, `get_file`, `list_files`, `delete_file` |
