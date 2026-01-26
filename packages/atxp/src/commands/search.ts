import { callTool } from '../call-tool.js';
import chalk from 'chalk';

const SERVER = 'search.mcp.atxp.ai';
const TOOL = 'search';

export async function searchCommand(query: string): Promise<void> {
  if (!query || query.trim().length === 0) {
    console.error(chalk.red('Error: Search query is required'));
    console.log(`Usage: ${chalk.cyan('npx atxp search <query>')}`);
    process.exit(1);
  }

  const result = await callTool(SERVER, TOOL, { query: query.trim() });
  console.log(result);
}
