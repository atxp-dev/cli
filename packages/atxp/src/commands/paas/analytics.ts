import { callTool } from '../../call-tool.js';
import chalk from 'chalk';

const SERVER = 'paas.mcp.atxp.ai';

interface AnalyticsQueryOptions {
  sql?: string;
  range?: string;
}

interface AnalyticsEventsOptions {
  event?: string;
  limit?: number;
  range?: string;
}

interface AnalyticsStatsOptions {
  groupBy?: string;
  range?: string;
}

export async function analyticsQueryCommand(options: AnalyticsQueryOptions): Promise<void> {
  if (!options.sql) {
    console.error(chalk.red('Error: --sql flag is required'));
    console.log(`Usage: ${chalk.cyan('npx atxp paas analytics query --sql <query>')}`);
    console.log();
    console.log('Example queries:');
    console.log('  --sql "SELECT blob1 as event, COUNT(*) as count FROM analytics_data GROUP BY blob1"');
    console.log('  --sql "SELECT SUM(double1) as total FROM analytics_data"');
    console.log();
    console.log('Note: Use "analytics_data" as the table name - it will be replaced automatically.');
    console.log('Time filtering (default 24h) is applied unless your query includes "timestamp".');
    process.exit(1);
  }

  const args: Record<string, unknown> = { sql: options.sql };

  if (options.range) {
    const validRanges = ['1h', '6h', '24h', '7d', '30d'];
    if (!validRanges.includes(options.range)) {
      console.error(chalk.red(`Error: Invalid time range. Must be one of: ${validRanges.join(', ')}`));
      process.exit(1);
    }
    args.time_range = options.range;
  }

  const result = await callTool(SERVER, 'query_analytics', args);
  console.log(result);
}

export async function analyticsEventsCommand(options: AnalyticsEventsOptions): Promise<void> {
  const args: Record<string, unknown> = {};

  if (options.event) {
    args.event_name = options.event;
  }
  if (options.limit !== undefined) {
    args.limit = options.limit;
  }
  if (options.range) {
    const validRanges = ['1h', '6h', '24h', '7d', '30d'];
    if (!validRanges.includes(options.range)) {
      console.error(chalk.red(`Error: Invalid time range. Must be one of: ${validRanges.join(', ')}`));
      process.exit(1);
    }
    args.time_range = options.range;
  }

  const result = await callTool(SERVER, 'list_analytics_events', args);
  console.log(result);
}

export async function analyticsStatsCommand(options: AnalyticsStatsOptions): Promise<void> {
  const args: Record<string, unknown> = {};

  if (options.groupBy) {
    const validGroupBy = ['event_name', 'hour', 'day'];
    if (!validGroupBy.includes(options.groupBy)) {
      console.error(chalk.red(`Error: Invalid group-by value. Must be one of: ${validGroupBy.join(', ')}`));
      process.exit(1);
    }
    args.group_by = options.groupBy;
  }
  if (options.range) {
    const validRanges = ['1h', '6h', '24h', '7d', '30d'];
    if (!validRanges.includes(options.range)) {
      console.error(chalk.red(`Error: Invalid time range. Must be one of: ${validRanges.join(', ')}`));
      process.exit(1);
    }
    args.time_range = options.range;
  }

  const result = await callTool(SERVER, 'get_analytics_stats', args);
  console.log(result);
}
