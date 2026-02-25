import { getClient, extractResult, type ToolResult } from '../call-tool.js';
import chalk from 'chalk';
import ora from 'ora';

const SERVER = 'music.mcp.atxp.ai';
const POLL_INTERVAL_MS = 5000;

export async function musicCommand(prompt: string): Promise<void> {
  if (!prompt || prompt.trim().length === 0) {
    console.error(chalk.red('Error: Music prompt is required'));
    console.log(`Usage: ${chalk.cyan('npx atxp music <prompt>')}`);
    process.exit(1);
  }

  const client = await getClient(SERVER);

  // Initiate async generation
  const initResult = (await client.callTool({
    name: 'music_create_async',
    arguments: { prompt: prompt.trim() },
  })) as ToolResult;

  const initText = extractResult(initResult);
  let taskId: string | undefined;
  try {
    const parsed = JSON.parse(initText);
    taskId = parsed.taskId;
  } catch {
    console.log(initText);
    return;
  }

  if (!taskId) {
    console.log(initText);
    return;
  }

  // Poll for completion
  const spinner = ora('Generating music...').start();
  try {
    while (true) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

      const pollResult = (await client.callTool({
        name: 'music_get_async',
        arguments: { taskId },
      })) as ToolResult;

      const pollText = extractResult(pollResult);
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(pollText) as Record<string, unknown>;
      } catch {
        spinner.stop();
        console.log(pollText);
        return;
      }

      if (parsed.status === 'completed' || parsed.status === 'success') {
        spinner.succeed('Music generated');
        delete parsed.status;
        console.log(JSON.stringify(parsed, null, 2));
        return;
      } else if (parsed.status === 'failed' || parsed.error) {
        spinner.fail('Music generation failed');
        console.error(chalk.red((parsed.error as string) || JSON.stringify(parsed)));
        process.exit(1);
      }

      if (parsed.status) {
        spinner.text = `Generating music... (${parsed.status})`;
      }
    }
  } catch (error) {
    spinner.fail('Music generation failed');
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Error: ${errorMessage}`));
    process.exit(1);
  }
}
