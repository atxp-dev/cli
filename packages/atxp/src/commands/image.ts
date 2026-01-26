import { callTool } from '../call-tool.js';
import chalk from 'chalk';

const SERVER = 'image.mcp.atxp.ai';
const TOOL = 'image_create_image';

export async function imageCommand(prompt: string): Promise<void> {
  if (!prompt || prompt.trim().length === 0) {
    console.error(chalk.red('Error: Image prompt is required'));
    console.log(`Usage: ${chalk.cyan('npx atxp image <prompt>')}`);
    process.exit(1);
  }

  const result = await callTool(SERVER, TOOL, { prompt: prompt.trim() });
  console.log(result);
}
