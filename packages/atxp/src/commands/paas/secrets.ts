import { callTool } from '../../call-tool.js';
import chalk from 'chalk';

const SERVER = 'paas.mcp.atxp.ai';

/**
 * Validate that a secret key follows UPPER_SNAKE_CASE convention
 */
function isValidSecretKey(key: string): boolean {
  return /^[A-Z][A-Z0-9_]*$/.test(key);
}

/**
 * Parse KEY=VALUE format into key and value
 */
function parseKeyValue(input: string): { key: string; value: string } | null {
  const eqIndex = input.indexOf('=');
  if (eqIndex === -1) {
    return null;
  }
  const key = input.substring(0, eqIndex);
  const value = input.substring(eqIndex + 1);
  return { key, value };
}

export async function secretsSetCommand(
  workerName: string,
  keyValuePair: string
): Promise<void> {
  const parsed = parseKeyValue(keyValuePair);
  if (!parsed) {
    console.error(chalk.red('Error: Invalid format. Use KEY=VALUE'));
    console.log(`Usage: ${chalk.cyan('npx atxp paas secrets set <worker> KEY=VALUE')}`);
    process.exit(1);
  }

  const { key, value } = parsed;

  if (!isValidSecretKey(key)) {
    console.error(chalk.red('Error: Secret key must be UPPER_SNAKE_CASE (e.g., API_KEY, DATABASE_URL)'));
    console.log(`Example: ${chalk.cyan('npx atxp paas secrets set my-worker API_KEY=sk-123')}`);
    process.exit(1);
  }

  if (!value) {
    console.error(chalk.red('Error: Secret value cannot be empty'));
    process.exit(1);
  }

  const result = await callTool(SERVER, 'set_secret', {
    worker_name: workerName,
    key,
    value,
  });
  console.log(result);
}

export async function secretsListCommand(workerName: string): Promise<void> {
  const result = await callTool(SERVER, 'list_secrets', {
    worker_name: workerName,
  });
  console.log(result);
}

export async function secretsDeleteCommand(
  workerName: string,
  key: string
): Promise<void> {
  if (!isValidSecretKey(key)) {
    console.error(chalk.red('Error: Secret key must be UPPER_SNAKE_CASE (e.g., API_KEY, DATABASE_URL)'));
    process.exit(1);
  }

  const result = await callTool(SERVER, 'delete_secret', {
    worker_name: workerName,
    key,
  });
  console.log(result);
}
