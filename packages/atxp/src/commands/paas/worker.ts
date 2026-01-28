import { callTool } from '../../call-tool.js';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

const SERVER = 'paas.mcp.atxp.ai';

interface WorkerDeployOptions {
  code?: string;
  db?: string[];
  bucket?: string[];
  enableAnalytics?: boolean | string;
  env?: string[];
  envFile?: string;
}

// Base reserved env var names that conflict with existing bindings
export const BASE_RESERVED_ENV_NAMES = ['DB', 'BUCKET', 'USER_NAMESPACE'];

/**
 * Get reserved env var names based on analytics binding configuration
 */
export function getReservedEnvNames(analyticsBindingName?: string): string[] {
  // If analytics is enabled, add the binding name to reserved list
  // Default binding name is 'ANALYTICS'
  const bindingName = analyticsBindingName || 'ANALYTICS';
  return [...BASE_RESERVED_ENV_NAMES, bindingName.toUpperCase()];
}

// Patterns that suggest sensitive data (warn user about plain text storage)
export const SENSITIVE_PATTERNS = [/SECRET/i, /PASSWORD/i, /KEY/i, /TOKEN/i, /CREDENTIAL/i];

/**
 * Validate an environment variable name
 * Must be a valid identifier and not reserved
 */
export function validateEnvVarName(name: string, reservedNames: string[]): { valid: boolean; error?: string } {
  // Check if it's a valid identifier (starts with letter or underscore, contains only alphanumeric and underscores)
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    return { valid: false, error: `Invalid env var name "${name}": must be a valid identifier (letters, numbers, underscores, cannot start with number)` };
  }

  // Check if it's reserved
  if (reservedNames.includes(name.toUpperCase())) {
    return { valid: false, error: `Reserved env var name "${name}": conflicts with existing bindings (${reservedNames.join(', ')})` };
  }

  return { valid: true };
}

/**
 * Parse a KEY=VALUE string into key and value
 */
export function parseEnvArg(arg: string): { key: string; value: string } | null {
  const eqIndex = arg.indexOf('=');
  if (eqIndex === -1) {
    return null;
  }
  const key = arg.slice(0, eqIndex);
  const value = arg.slice(eqIndex + 1);
  return { key, value };
}

/**
 * Parse a .env file into a key-value record
 * Supports:
 * - KEY=VALUE format
 * - Comments starting with #
 * - Empty lines
 * - Quoted values (single or double quotes)
 */
export function parseEnvFile(filePath: string): Record<string, string> {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Env file not found: ${absolutePath}`);
  }

  const content = fs.readFileSync(absolutePath, 'utf-8');
  const result: Record<string, string> = {};

  for (const line of content.split('\n')) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    // Remove surrounding quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (key) {
      result[key] = value;
    }
  }

  return result;
}

interface WorkerLogsOptions {
  limit?: number;
  level?: string;
  since?: string;
  follow?: boolean;
  interval?: number;
}

export async function workerDeployCommand(
  name: string,
  options: WorkerDeployOptions
): Promise<void> {
  if (!options.code) {
    console.error(chalk.red('Error: --code flag is required'));
    console.log(`Usage: ${chalk.cyan('npx atxp paas worker deploy <name> --code <file>')}`);
    process.exit(1);
  }

  // Read code from file
  const codePath = path.resolve(options.code);
  if (!fs.existsSync(codePath)) {
    console.error(chalk.red(`Error: File not found: ${codePath}`));
    process.exit(1);
  }

  const code = fs.readFileSync(codePath, 'utf-8');

  // Build database bindings if provided
  const databaseBindings = options.db?.map((binding) => {
    const [bindingName, dbName] = binding.split(':');
    return {
      binding: bindingName || 'DB',
      database_name: dbName || bindingName,
    };
  });

  // Build storage bindings if provided
  const storageBindings = options.bucket?.map((binding) => {
    const [bindingName, bucketName] = binding.split(':');
    return {
      binding: bindingName || 'BUCKET',
      bucket_name: bucketName || bindingName,
    };
  });

  // Process environment variables
  // Start with env file (lower precedence)
  const envVars: Record<string, string> = {};

  if (options.envFile) {
    try {
      const fileEnvVars = parseEnvFile(options.envFile);
      Object.assign(envVars, fileEnvVars);
    } catch (error) {
      console.error(chalk.red(`Error: ${(error as Error).message}`));
      process.exit(1);
    }
  }

  // Process --env flags (higher precedence, overrides file)
  if (options.env && options.env.length > 0) {
    for (const envArg of options.env) {
      const parsed = parseEnvArg(envArg);
      if (!parsed) {
        console.error(chalk.red(`Error: Invalid env var format "${envArg}". Expected KEY=VALUE`));
        process.exit(1);
      }
      envVars[parsed.key] = parsed.value;
    }
  }

  // Determine the analytics binding name for reserved name validation
  const analyticsBindingName = typeof options.enableAnalytics === 'string'
    ? options.enableAnalytics
    : options.enableAnalytics ? 'ANALYTICS' : undefined;
  const reservedNames = options.enableAnalytics
    ? getReservedEnvNames(analyticsBindingName)
    : BASE_RESERVED_ENV_NAMES;

  // Validate all env var names
  for (const key of Object.keys(envVars)) {
    const validation = validateEnvVarName(key, reservedNames);
    if (!validation.valid) {
      console.error(chalk.red(`Error: ${validation.error}`));
      process.exit(1);
    }
  }

  // Warn about sensitive-looking variables
  const sensitiveVars = Object.keys(envVars).filter((key) =>
    SENSITIVE_PATTERNS.some((pattern) => pattern.test(key))
  );
  if (sensitiveVars.length > 0) {
    console.log(chalk.yellow(`Warning: The following env vars may contain sensitive data and will be stored as plain text:`));
    console.log(chalk.yellow(`  ${sensitiveVars.join(', ')}`));
    console.log(chalk.yellow(`  Consider using Cloudflare Secrets for sensitive values.`));
  }

  const args: Record<string, unknown> = { name, code };
  if (databaseBindings && databaseBindings.length > 0) {
    args.database_bindings = databaseBindings;
  }
  if (storageBindings && storageBindings.length > 0) {
    args.storage_bindings = storageBindings;
  }
  if (options.enableAnalytics) {
    // Pass the binding name if specified, otherwise true for default 'ANALYTICS'
    args.enable_analytics = typeof options.enableAnalytics === 'string'
      ? options.enableAnalytics
      : true;
  }
  if (Object.keys(envVars).length > 0) {
    args.env_vars = envVars;
  }

  const result = await callTool(SERVER, 'deploy_worker', args);
  console.log(result);
}

export async function workerListCommand(): Promise<void> {
  const result = await callTool(SERVER, 'list_deployments', {});
  console.log(result);
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  [key: string]: unknown;
}

const LOG_LEVEL_COLORS: Record<string, (text: string) => string> = {
  error: chalk.red,
  warn: chalk.yellow,
  warning: chalk.yellow,
  info: chalk.blue,
  debug: chalk.gray,
  log: chalk.white,
};

function formatAndPrintLog(log: LogEntry): void {
  const colorFn = LOG_LEVEL_COLORS[log.level?.toLowerCase()] || chalk.white;
  const timestamp = chalk.gray(log.timestamp);
  const level = colorFn(`[${log.level?.toUpperCase() || 'LOG'}]`);
  console.log(`${timestamp} ${level} ${log.message}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function streamLogs(
  name: string,
  options: WorkerLogsOptions
): Promise<void> {
  const pollInterval = options.interval || 2000;
  const maxRetries = 3;
  const retryDelay = 5000;
  const maxSeenIds = 10000;

  let lastTimestamp: string | undefined = options.since;
  const seenIds = new Set<string>();
  let running = true;
  let retryCount = 0;

  const cleanup = () => {
    running = false;
    console.log(chalk.yellow('\nStopping log stream...'));
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  console.log(chalk.cyan(`Streaming logs for ${name}... (Ctrl+C to stop)`));

  while (running) {
    try {
      const args: Record<string, unknown> = { name };

      if (options.limit !== undefined) {
        args.limit = options.limit;
      }
      if (options.level) {
        args.level = options.level;
      }
      if (lastTimestamp) {
        args.since = lastTimestamp;
      }

      const result = await callTool(SERVER, 'get_logs', args);
      retryCount = 0; // Reset retry count on success

      // Parse the result - it may be a string or already parsed
      let logs: LogEntry[] = [];
      if (typeof result === 'string') {
        try {
          const parsed = JSON.parse(result);
          logs = Array.isArray(parsed) ? parsed : (parsed.logs || []);
        } catch {
          // If parsing fails, it might be a formatted string output
          // In that case, just print it and continue
          if (result.trim() && !result.includes('No logs found')) {
            console.log(result);
          }
          await sleep(pollInterval);
          continue;
        }
      } else if (Array.isArray(result)) {
        logs = result;
      } else if (result && typeof result === 'object' && 'logs' in result) {
        logs = (result as { logs: LogEntry[] }).logs;
      }

      // Filter out already-seen logs and print new ones
      for (const log of logs) {
        // Create a unique ID from timestamp and message
        const logId = `${log.timestamp}-${log.message}`;

        if (!seenIds.has(logId)) {
          seenIds.add(logId);
          formatAndPrintLog(log);

          // Update lastTimestamp for next poll
          if (log.timestamp && (!lastTimestamp || log.timestamp > lastTimestamp)) {
            lastTimestamp = log.timestamp;
          }
        }
      }

      // Bound the seenIds set to prevent memory growth
      if (seenIds.size > maxSeenIds) {
        const idsArray = Array.from(seenIds);
        const toDelete = idsArray.slice(0, idsArray.length - maxSeenIds);
        for (const id of toDelete) {
          seenIds.delete(id);
        }
      }

      await sleep(pollInterval);
    } catch (error) {
      retryCount++;
      if (retryCount >= maxRetries) {
        console.error(chalk.red(`Error fetching logs after ${maxRetries} retries: ${(error as Error).message}`));
        process.exit(1);
      }
      console.error(chalk.yellow(`Error fetching logs (retry ${retryCount}/${maxRetries}): ${(error as Error).message}`));
      await sleep(retryDelay);
    }
  }
}

export async function workerLogsCommand(
  name: string,
  options: WorkerLogsOptions
): Promise<void> {
  // If follow mode, use streaming
  if (options.follow) {
    await streamLogs(name, options);
    return;
  }

  // One-time fetch (original behavior)
  const args: Record<string, unknown> = { name };

  if (options.limit !== undefined) {
    args.limit = options.limit;
  }
  if (options.level) {
    args.level = options.level;
  }
  if (options.since) {
    args.since = options.since;
  }

  const result = await callTool(SERVER, 'get_logs', args);
  console.log(result);
}

export async function workerDeleteCommand(name: string): Promise<void> {
  const result = await callTool(SERVER, 'delete_worker', { name });
  console.log(result);
}
