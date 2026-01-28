import chalk from 'chalk';
import {
  workerDeployCommand,
  workerListCommand,
  workerLogsCommand,
  workerDeleteCommand,
} from './worker.js';
import {
  dbCreateCommand,
  dbListCommand,
  dbQueryCommand,
  dbDeleteCommand,
} from './db.js';
import {
  storageCreateCommand,
  storageListCommand,
  storageUploadCommand,
  storageDownloadCommand,
  storageFilesCommand,
  storageDeleteBucketCommand,
  storageDeleteFileCommand,
} from './storage.js';
import {
  dnsAddCommand,
  dnsListCommand,
  dnsRecordCreateCommand,
  dnsRecordListCommand,
  dnsRecordDeleteCommand,
  dnsConnectCommand,
} from './dns.js';
import {
  analyticsQueryCommand,
  analyticsEventsCommand,
  analyticsStatsCommand,
} from './analytics.js';

interface PaasOptions {
  code?: string;
  db?: string[];
  bucket?: string[];
  limit?: number;
  level?: string;
  since?: string;
  sql?: string;
  params?: string;
  file?: string;
  content?: string;
  output?: string;
  prefix?: string;
  type?: string;
  name?: string;
  recordContent?: string;
  ttl?: number;
  proxied?: boolean;
  priority?: number;
  subdomain?: string;
  range?: string;
  event?: string;
  groupBy?: string;
  enableAnalytics?: boolean;
  env?: string[];
  envFile?: string;
}

function showPaasHelp(): void {
  console.log(chalk.bold('ATXP PAAS Commands'));
  console.log(chalk.gray('Deploy workers, databases, storage, and more'));
  console.log();

  console.log(chalk.bold('Worker Commands:'));
  console.log('  ' + chalk.cyan('paas worker deploy') + ' ' + chalk.yellow('<name>') + '      Deploy a worker');
  console.log('    ' + chalk.gray('--code <file>') + '         Path to worker code file');
  console.log('    ' + chalk.gray('--db <binding:name>') + '   Bind a database (repeatable)');
  console.log('    ' + chalk.gray('--bucket <binding:name>') + ' Bind a storage bucket (repeatable)');
  console.log('    ' + chalk.gray('--env KEY=VALUE') + '       Set environment variable (repeatable)');
  console.log('    ' + chalk.gray('--env-file <path>') + '     Load env vars from file');
  console.log('    ' + chalk.gray('--enable-analytics') + '    Enable Analytics Engine binding');
  console.log('  ' + chalk.cyan('paas worker list') + '                 List all workers');
  console.log('  ' + chalk.cyan('paas worker logs') + ' ' + chalk.yellow('<name>') + '        Get worker logs');
  console.log('  ' + chalk.cyan('paas worker delete') + ' ' + chalk.yellow('<name>') + '      Delete a worker');
  console.log();

  console.log(chalk.bold('Database Commands:'));
  console.log('  ' + chalk.cyan('paas db create') + ' ' + chalk.yellow('<name>') + '          Create a database');
  console.log('  ' + chalk.cyan('paas db list') + '                     List all databases');
  console.log('  ' + chalk.cyan('paas db query') + ' ' + chalk.yellow('<database>') + '       Execute SQL query');
  console.log('  ' + chalk.cyan('paas db delete') + ' ' + chalk.yellow('<name>') + '          Delete a database');
  console.log();

  console.log(chalk.bold('Storage Commands:'));
  console.log('  ' + chalk.cyan('paas storage create') + ' ' + chalk.yellow('<name>') + '     Create a bucket');
  console.log('  ' + chalk.cyan('paas storage list') + '                List all buckets');
  console.log('  ' + chalk.cyan('paas storage upload') + ' ' + chalk.yellow('<bucket> <key>') + '  Upload a file');
  console.log('  ' + chalk.cyan('paas storage download') + ' ' + chalk.yellow('<bucket> <key>') + '  Download a file');
  console.log('  ' + chalk.cyan('paas storage files') + ' ' + chalk.yellow('<bucket>') + '    List files in bucket');
  console.log('  ' + chalk.cyan('paas storage delete-bucket') + ' ' + chalk.yellow('<name>') + '  Delete a bucket');
  console.log('  ' + chalk.cyan('paas storage delete-file') + ' ' + chalk.yellow('<bucket> <key>') + '  Delete a file');
  console.log();

  console.log(chalk.bold('DNS Commands:'));
  console.log('  ' + chalk.cyan('paas dns add') + ' ' + chalk.yellow('<domain>') + '          Add a domain');
  console.log('  ' + chalk.cyan('paas dns list') + '                    List all domains');
  console.log('  ' + chalk.cyan('paas dns record create') + ' ' + chalk.yellow('<domain>') + ' Create DNS record');
  console.log('  ' + chalk.cyan('paas dns record list') + ' ' + chalk.yellow('<domain>') + '   List DNS records');
  console.log('  ' + chalk.cyan('paas dns record delete') + ' ' + chalk.yellow('<domain> <id>') + '  Delete DNS record');
  console.log('  ' + chalk.cyan('paas dns connect') + ' ' + chalk.yellow('<domain> <worker>') + '  Connect domain to worker');
  console.log();

  console.log(chalk.bold('Analytics Commands:'));
  console.log('  ' + chalk.cyan('paas analytics query') + '             Query analytics data');
  console.log('  ' + chalk.cyan('paas analytics events') + '            List analytics events');
  console.log('  ' + chalk.cyan('paas analytics stats') + '             Get analytics statistics');
  console.log();

  console.log(chalk.bold('Examples:'));
  console.log('  npx atxp paas worker deploy my-api --code ./worker.js');
  console.log('  npx atxp paas db create my-database');
  console.log('  npx atxp paas db query my-database --sql "SELECT * FROM users"');
  console.log('  npx atxp paas storage upload my-bucket images/logo.png --file ./logo.png');
  console.log('  npx atxp paas dns add example.com');
  console.log('  npx atxp paas dns connect example.com my-api');
}

export async function paasCommand(args: string[], options: PaasOptions): Promise<void> {
  const category = args[0];
  const subCommand = args[1];
  const restArgs = args.slice(2);

  if (!category || category === 'help') {
    showPaasHelp();
    return;
  }

  switch (category) {
    case 'worker':
      await handleWorkerCommand(subCommand, restArgs, options);
      break;

    case 'db':
      await handleDbCommand(subCommand, restArgs, options);
      break;

    case 'storage':
      await handleStorageCommand(subCommand, restArgs, options);
      break;

    case 'dns':
      await handleDnsCommand(subCommand, restArgs, options);
      break;

    case 'analytics':
      await handleAnalyticsCommand(subCommand, restArgs, options);
      break;

    default:
      console.error(chalk.red(`Unknown PAAS category: ${category}`));
      console.log('Available categories: worker, db, storage, dns, analytics');
      console.log(`Run ${chalk.cyan('npx atxp paas help')} for usage information.`);
      process.exit(1);
  }
}

async function handleWorkerCommand(
  subCommand: string,
  args: string[],
  options: PaasOptions
): Promise<void> {
  const name = args[0];

  switch (subCommand) {
    case 'deploy':
      if (!name) {
        console.error(chalk.red('Error: Worker name is required'));
        console.log(`Usage: ${chalk.cyan('npx atxp paas worker deploy <name> --code <file>')}`);
        process.exit(1);
      }
      await workerDeployCommand(name, {
        code: options.code,
        db: options.db,
        bucket: options.bucket,
        enableAnalytics: options.enableAnalytics,
        env: options.env,
        envFile: options.envFile,
      });
      break;

    case 'list':
      await workerListCommand();
      break;

    case 'logs':
      if (!name) {
        console.error(chalk.red('Error: Worker name is required'));
        console.log(`Usage: ${chalk.cyan('npx atxp paas worker logs <name>')}`);
        process.exit(1);
      }
      await workerLogsCommand(name, {
        limit: options.limit,
        level: options.level,
        since: options.since,
      });
      break;

    case 'delete':
      if (!name) {
        console.error(chalk.red('Error: Worker name is required'));
        console.log(`Usage: ${chalk.cyan('npx atxp paas worker delete <name>')}`);
        process.exit(1);
      }
      await workerDeleteCommand(name);
      break;

    default:
      console.error(chalk.red(`Unknown worker command: ${subCommand}`));
      console.log('Available commands: deploy, list, logs, delete');
      process.exit(1);
  }
}

async function handleDbCommand(
  subCommand: string,
  args: string[],
  options: PaasOptions
): Promise<void> {
  const name = args[0];

  switch (subCommand) {
    case 'create':
      if (!name) {
        console.error(chalk.red('Error: Database name is required'));
        console.log(`Usage: ${chalk.cyan('npx atxp paas db create <name>')}`);
        process.exit(1);
      }
      await dbCreateCommand(name);
      break;

    case 'list':
      await dbListCommand();
      break;

    case 'query':
      if (!name) {
        console.error(chalk.red('Error: Database name is required'));
        console.log(`Usage: ${chalk.cyan('npx atxp paas db query <database> --sql <query>')}`);
        process.exit(1);
      }
      await dbQueryCommand(name, {
        sql: options.sql,
        params: options.params,
      });
      break;

    case 'delete':
      if (!name) {
        console.error(chalk.red('Error: Database name is required'));
        console.log(`Usage: ${chalk.cyan('npx atxp paas db delete <name>')}`);
        process.exit(1);
      }
      await dbDeleteCommand(name);
      break;

    default:
      console.error(chalk.red(`Unknown db command: ${subCommand}`));
      console.log('Available commands: create, list, query, delete');
      process.exit(1);
  }
}

async function handleStorageCommand(
  subCommand: string,
  args: string[],
  options: PaasOptions
): Promise<void> {
  const bucket = args[0];
  const key = args[1];

  switch (subCommand) {
    case 'create':
      if (!bucket) {
        console.error(chalk.red('Error: Bucket name is required'));
        console.log(`Usage: ${chalk.cyan('npx atxp paas storage create <name>')}`);
        process.exit(1);
      }
      await storageCreateCommand(bucket);
      break;

    case 'list':
      await storageListCommand();
      break;

    case 'upload':
      if (!bucket || !key) {
        console.error(chalk.red('Error: Bucket and key are required'));
        console.log(`Usage: ${chalk.cyan('npx atxp paas storage upload <bucket> <key> --file <path>')}`);
        process.exit(1);
      }
      await storageUploadCommand(bucket, key, {
        file: options.file,
        content: options.content,
      });
      break;

    case 'download':
      if (!bucket || !key) {
        console.error(chalk.red('Error: Bucket and key are required'));
        console.log(`Usage: ${chalk.cyan('npx atxp paas storage download <bucket> <key>')}`);
        process.exit(1);
      }
      await storageDownloadCommand(bucket, key, {
        output: options.output,
      });
      break;

    case 'files':
      if (!bucket) {
        console.error(chalk.red('Error: Bucket name is required'));
        console.log(`Usage: ${chalk.cyan('npx atxp paas storage files <bucket>')}`);
        process.exit(1);
      }
      await storageFilesCommand(bucket, {
        prefix: options.prefix,
        limit: options.limit,
      });
      break;

    case 'delete-bucket':
      if (!bucket) {
        console.error(chalk.red('Error: Bucket name is required'));
        console.log(`Usage: ${chalk.cyan('npx atxp paas storage delete-bucket <name>')}`);
        process.exit(1);
      }
      await storageDeleteBucketCommand(bucket);
      break;

    case 'delete-file':
      if (!bucket || !key) {
        console.error(chalk.red('Error: Bucket and key are required'));
        console.log(`Usage: ${chalk.cyan('npx atxp paas storage delete-file <bucket> <key>')}`);
        process.exit(1);
      }
      await storageDeleteFileCommand(bucket, key);
      break;

    default:
      console.error(chalk.red(`Unknown storage command: ${subCommand}`));
      console.log('Available commands: create, list, upload, download, files, delete-bucket, delete-file');
      process.exit(1);
  }
}

async function handleDnsCommand(
  subCommand: string,
  args: string[],
  options: PaasOptions
): Promise<void> {
  const domain = args[0];

  switch (subCommand) {
    case 'add':
      if (!domain) {
        console.error(chalk.red('Error: Domain name is required'));
        console.log(`Usage: ${chalk.cyan('npx atxp paas dns add <domain>')}`);
        process.exit(1);
      }
      await dnsAddCommand(domain);
      break;

    case 'list':
      await dnsListCommand();
      break;

    case 'record': {
      const recordSubCommand = args[0];
      const recordDomain = args[1];
      const recordId = args[2];

      switch (recordSubCommand) {
        case 'create':
          if (!recordDomain) {
            console.error(chalk.red('Error: Domain name is required'));
            console.log(`Usage: ${chalk.cyan('npx atxp paas dns record create <domain> --type A --name www --content <ip>')}`);
            process.exit(1);
          }
          await dnsRecordCreateCommand(recordDomain, {
            type: options.type,
            name: options.name,
            content: options.recordContent,
            ttl: options.ttl,
            proxied: options.proxied,
            priority: options.priority,
          });
          break;

        case 'list':
          if (!recordDomain) {
            console.error(chalk.red('Error: Domain name is required'));
            console.log(`Usage: ${chalk.cyan('npx atxp paas dns record list <domain>')}`);
            process.exit(1);
          }
          await dnsRecordListCommand(recordDomain, {
            type: options.type,
          });
          break;

        case 'delete':
          if (!recordDomain || !recordId) {
            console.error(chalk.red('Error: Domain and record ID are required'));
            console.log(`Usage: ${chalk.cyan('npx atxp paas dns record delete <domain> <recordId>')}`);
            process.exit(1);
          }
          await dnsRecordDeleteCommand(recordDomain, recordId);
          break;

        default:
          console.error(chalk.red(`Unknown dns record command: ${recordSubCommand}`));
          console.log('Available commands: create, list, delete');
          process.exit(1);
      }
      return;
    }

    case 'connect': {
      const workerName = args[1];
      if (!domain || !workerName) {
        console.error(chalk.red('Error: Domain and worker name are required'));
        console.log(`Usage: ${chalk.cyan('npx atxp paas dns connect <domain> <worker>')}`);
        process.exit(1);
      }
      await dnsConnectCommand(domain, workerName, {
        subdomain: options.subdomain,
      });
      break;
    }

    default:
      console.error(chalk.red(`Unknown dns command: ${subCommand}`));
      console.log('Available commands: add, list, record, connect');
      process.exit(1);
  }
}

async function handleAnalyticsCommand(
  subCommand: string,
  _args: string[],
  options: PaasOptions
): Promise<void> {
  switch (subCommand) {
    case 'query':
      await analyticsQueryCommand({
        sql: options.sql,
        range: options.range,
      });
      break;

    case 'events':
      await analyticsEventsCommand({
        event: options.event,
        limit: options.limit,
        range: options.range,
      });
      break;

    case 'stats':
      await analyticsStatsCommand({
        groupBy: options.groupBy,
        range: options.range,
      });
      break;

    default:
      console.error(chalk.red(`Unknown analytics command: ${subCommand}`));
      console.log('Available commands: query, events, stats');
      process.exit(1);
  }
}
