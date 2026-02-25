import { getClient, extractResult, type ToolResult } from '../call-tool.js';
import chalk from 'chalk';
import ora from 'ora';

const SERVER = 'image.mcp.atxp.ai';
const POLL_INTERVAL_MS = 3000;

export async function imageCommand(prompt: string): Promise<void> {
  if (!prompt || prompt.trim().length === 0) {
    console.error(chalk.red('Error: Image prompt is required'));
    console.log(`Usage: ${chalk.cyan('npx atxp image <prompt>')}`);
    process.exit(1);
  }

  const client = await getClient(SERVER);

  // Initiate async generation
  const initResult = (await client.callTool({
    name: 'image_create_image_async',
    arguments: { prompt: prompt.trim() },
  })) as ToolResult;

  const initText = extractResult(initResult);
  let taskId: string | undefined;
  try {
    const parsed = JSON.parse(initText);
    taskId = parsed.taskId;
  } catch {
    // If the response isn't JSON with a taskId, it may have completed synchronously
    console.log(initText);
    return;
  }

  if (!taskId) {
    console.log(initText);
    return;
  }

  // Poll for completion
  const spinner = ora('Generating image...').start();
  try {
    while (true) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

      const pollResult = (await client.callTool({
        name: 'image_get_image_async',
        arguments: { taskId },
      })) as ToolResult;

      const pollText = extractResult(pollResult);
      let parsed: any;
      try {
        parsed = JSON.parse(pollText);
      } catch {
        // Non-JSON response — treat as final
        spinner.stop();
        console.log(pollText);
        return;
      }

      if (parsed.status === 'completed' || parsed.status === 'success') {
        spinner.succeed('Image generated');
        // Remove status field to show just the result
        delete parsed.status;
        console.log(JSON.stringify(parsed, null, 2));
        return;
      } else if (parsed.status === 'failed' || parsed.error) {
        spinner.fail('Image generation failed');
        console.error(chalk.red(parsed.error || JSON.stringify(parsed)));
        process.exit(1);
      }

      // Still in progress — update spinner
      if (parsed.status) {
        spinner.text = `Generating image... (${parsed.status})`;
      }
    }
  } catch (error) {
    spinner.fail('Image generation failed');
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Error: ${errorMessage}`));
    process.exit(1);
  }
}
