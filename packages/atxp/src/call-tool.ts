import { atxpClient, ATXPAccount } from '@atxp/client';
import chalk from 'chalk';
import { getConnection } from './config.js';
import { FileOAuthDb } from './file-oauth-db.js';
import { getCliLogger } from './verbose.js';

let oAuthDb: FileOAuthDb | null = null;
function getOAuthDb(): FileOAuthDb {
  if (!oAuthDb) {
    oAuthDb = new FileOAuthDb();
  }
  return oAuthDb;
}

export interface ToolResult {
  content: Array<{ type: string; text?: string; data?: string; mimeType?: string }>;
}

export type McpClient = Awaited<ReturnType<typeof atxpClient>>;

export async function getClient(server: string): Promise<McpClient> {
  const connection = getConnection();

  if (!connection) {
    console.error(chalk.red('Not logged in.'));
    console.error(`Run: ${chalk.cyan('npx atxp login')}`);
    process.exit(1);
  }

  return atxpClient({
    mcpServer: `https://${server}`,
    account: new ATXPAccount(connection),
    oAuthDb: getOAuthDb(),
    logger: getCliLogger(),
  });
}

export function extractResult(result: ToolResult): string {
  if (result.content && result.content.length > 0) {
    const content = result.content[0];
    if (content.text) {
      return content.text;
    } else if (content.data && content.mimeType) {
      return `[${content.mimeType} data received - ${content.data.length} bytes base64]`;
    }
  }
  return JSON.stringify(result, null, 2);
}

export async function callTool(
  server: string,
  tool: string,
  args: Record<string, unknown>
): Promise<string> {
  try {
    const client = await getClient(server);

    const result = (await client.callTool({
      name: tool,
      arguments: args,
    })) as ToolResult;

    return extractResult(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Error calling ${tool}: ${errorMessage}`));
    process.exit(1);
  }
}
