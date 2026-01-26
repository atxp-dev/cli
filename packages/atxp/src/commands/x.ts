import { callTool } from '../call-tool.js';
import chalk from 'chalk';

const SERVER = 'x-live-search.mcp.atxp.ai';
const TOOL = 'x_live_search';

export async function xCommand(query: string): Promise<void> {
  if (!query || query.trim().length === 0) {
    console.error(chalk.red('Error: Search query is required'));
    console.log(`Usage: ${chalk.cyan('npx atxp x <query>')}`);
    process.exit(1);
  }

  const result = await callTool(SERVER, TOOL, { query: query.trim() });
  console.log(result);
}
