import { callTool } from '../call-tool.js';
import chalk from 'chalk';

const SERVER = 'video.mcp.atxp.ai';
const TOOL = 'generate_video';

export async function videoCommand(prompt: string): Promise<void> {
  if (!prompt || prompt.trim().length === 0) {
    console.error(chalk.red('Error: Video prompt is required'));
    console.log(`Usage: ${chalk.cyan('npx atxp video <prompt>')}`);
    process.exit(1);
  }

  const result = await callTool(SERVER, TOOL, { prompt: prompt.trim() });
  console.log(result);
}
