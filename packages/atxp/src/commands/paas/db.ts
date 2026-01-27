import { callTool } from '../../call-tool.js';
import chalk from 'chalk';

const SERVER = 'paas.mcp.atxp.ai';

interface DbQueryOptions {
  sql?: string;
  params?: string;
}

export async function dbCreateCommand(name: string): Promise<void> {
  const result = await callTool(SERVER, 'create_database', { name });
  console.log(result);
}

export async function dbListCommand(): Promise<void> {
  const result = await callTool(SERVER, 'list_databases', {});
  console.log(result);
}

export async function dbQueryCommand(
  database: string,
  options: DbQueryOptions
): Promise<void> {
  if (!options.sql) {
    console.error(chalk.red('Error: --sql flag is required'));
    console.log(`Usage: ${chalk.cyan('npx atxp paas db query <database> --sql <query>')}`);
    process.exit(1);
  }

  const args: Record<string, unknown> = {
    database,
    sql: options.sql,
  };

  if (options.params) {
    try {
      args.params = JSON.parse(options.params);
    } catch {
      console.error(chalk.red('Error: --params must be valid JSON array'));
      console.log(`Example: ${chalk.cyan('--params \'["value1", "value2"]\'')}`);
      process.exit(1);
    }
  }

  const result = await callTool(SERVER, 'query', args);
  console.log(result);
}

export async function dbDeleteCommand(name: string): Promise<void> {
  const result = await callTool(SERVER, 'delete_database', { name });
  console.log(result);
}
