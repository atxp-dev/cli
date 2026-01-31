---
name: atxp
description: Access ATXP paid API tools for web search, AI image generation, music creation, video generation, X/Twitter search, and email. Use when users need real-time web search, AI-generated media (images, music, video), X/Twitter search, or to send/receive emails. Requires authentication via `npx atxp login`.
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
| `npx atxp email inbox` | Check your email inbox (FREE) |
| `npx atxp email read <messageId>` | Read a specific message (FREE) |
| `npx atxp email send <options>` | Send an email ($0.01/email) |

## Email

Each ATXP user gets a unique email address: `{user_id}@atxp.email`

### Check Inbox
```bash
npx atxp email inbox
```
Returns message metadata (from, subject, date, messageId). Use `email read` to get full message content.

### Read Message
```bash
npx atxp email read <messageId>
```
Retrieves the full content of a specific message including the body. Get the messageId from `email inbox` output.

### Send Email
```bash
npx atxp email send --to <email> --subject <subject> --body <body>
```

**Send Options:**
- `--to` - Recipient email address (required)
- `--subject` - Email subject line (required)
- `--body` - Email body content (required)

**Example:**
```bash
npx atxp email send --to user@example.com --subject "Hello" --body "Hi there!"
```

## PaaS Tools

Deploy serverless applications with functions, databases, object storage, custom domains, and analytics via `paas.mcp.atxp.ai`. See the `atxp-paas` skill for detailed usage.

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
| `email.mcp.atxp.ai` | `email_check_inbox`, `email_get_message`, `email_send_email` |
| `paas.mcp.atxp.ai` | PaaS tools (see `atxp-paas` skill) |
