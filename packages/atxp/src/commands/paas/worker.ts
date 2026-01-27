import { callTool } from '../../call-tool.js';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

const SERVER = 'paas.mcp.atxp.ai';

interface WorkerDeployOptions {
  code?: string;
  db?: string[];
  bucket?: string[];
  enableAnalytics?: boolean;
}

interface WorkerLogsOptions {
  limit?: number;
  level?: string;
  since?: string;
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

  const args: Record<string, unknown> = { name, code };
  if (databaseBindings && databaseBindings.length > 0) {
    args.database_bindings = databaseBindings;
  }
  if (storageBindings && storageBindings.length > 0) {
    args.storage_bindings = storageBindings;
  }
  if (options.enableAnalytics) {
    args.enable_analytics = true;
  }

  const result = await callTool(SERVER, 'deploy_worker', args);
  console.log(result);
}

export async function workerListCommand(): Promise<void> {
  const result = await callTool(SERVER, 'list_deployments', {});
  console.log(result);
}

export async function workerLogsCommand(
  name: string,
  options: WorkerLogsOptions
): Promise<void> {
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
