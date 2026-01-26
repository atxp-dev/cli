import { callTool } from '../call-tool.js';
import chalk from 'chalk';

const SERVER = 'music.mcp.atxp.ai';
const TOOL = 'music_create';

export async function musicCommand(prompt: string): Promise<void> {
  if (!prompt || prompt.trim().length === 0) {
    console.error(chalk.red('Error: Music prompt is required'));
    console.log(`Usage: ${chalk.cyan('npx atxp music <prompt>')}`);
    process.exit(1);
  }

  const result = await callTool(SERVER, TOOL, { prompt: prompt.trim() });
  console.log(result);
}
