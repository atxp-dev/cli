import { callTool } from '../call-tool.js';
import chalk from 'chalk';

const SERVER = 'search.mcp.atxp.ai';
const TOOL = 'search_search';

export interface SearchOptions {
  startDate?: string;
  endDate?: string;
}

export async function searchCommand(query: string, options: SearchOptions = {}): Promise<void> {
  if (!query || query.trim().length === 0) {
    console.error(chalk.red('Error: Search query is required'));
    console.log(`Usage: ${chalk.cyan('npx atxp search <query>')}`);
    process.exit(1);
  }

  const args: Record<string, unknown> = { query: query.trim() };
  if (options.startDate) {
    args.startPublishedDate = options.startDate;
  }
  if (options.endDate) {
    args.endPublishedDate = options.endDate;
  }

  const result = await callTool(SERVER, TOOL, args);
  console.log(result);
}
