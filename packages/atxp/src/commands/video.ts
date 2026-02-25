import { getClient, extractResult, type ToolResult } from '../call-tool.js';
import chalk from 'chalk';
import ora from 'ora';

const SERVER = 'video.mcp.atxp.ai';
const POLL_INTERVAL_MS = 10000;

export async function videoCommand(prompt: string): Promise<void> {
  if (!prompt || prompt.trim().length === 0) {
    console.error(chalk.red('Error: Video prompt is required'));
    console.log(`Usage: ${chalk.cyan('npx atxp video <prompt>')}`);
    process.exit(1);
  }

  const client = await getClient(SERVER);

  // Initiate generation — create_video returns a taskId
  const initResult = (await client.callTool({
    name: 'create_video',
    arguments: { userPrompt: prompt.trim() },
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

  // Poll for completion using wait_for_video with short timeouts
  const spinner = ora('Generating video...').start();
  try {
    while (true) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

      const pollResult = (await client.callTool({
        name: 'wait_for_video',
        arguments: { taskId, timeoutSeconds: 30 },
      })) as ToolResult;

      const pollText = extractResult(pollResult);
      let parsed: any;
      try {
        parsed = JSON.parse(pollText);
      } catch {
        spinner.stop();
        console.log(pollText);
        return;
      }

      if (parsed.status === 'completed' || parsed.status === 'success') {
        spinner.succeed('Video generated');
        delete parsed.status;
        console.log(JSON.stringify(parsed, null, 2));
        return;
      } else if (parsed.status === 'failed' || parsed.error) {
        spinner.fail('Video generation failed');
        console.error(chalk.red(parsed.error || JSON.stringify(parsed)));
        process.exit(1);
      }

      if (parsed.status) {
        spinner.text = `Generating video... (${parsed.status})`;
      }
    }
  } catch (error) {
    spinner.fail('Video generation failed');
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Error: ${errorMessage}`));
    process.exit(1);
  }
}
