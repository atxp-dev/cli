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
  analyticsListCommand,
  analyticsSchemaCommand,
} from './analytics.js';
import {
  secretsSetCommand,
  secretsListCommand,
  secretsDeleteCommand,
} from './secrets.js';
import {
  showPaasOverview,
  showCategoryHelp,
  showCommandHelp,
} from './help.js';

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
  enableAnalytics?: boolean | string;
  env?: string[];
  envFile?: string;
  follow?: boolean;
  interval?: number;
}

export async function paasCommand(args: string[], options: PaasOptions): Promise<void> {
  const helpRequested = process.argv.includes('--help') || process.argv.includes('-h');
  const category = args[0];
  const subCommand = args[1];
  const restArgs = args.slice(2);

  // Handle help at various levels
  if (helpRequested || !category || category === 'help') {
    if (!category || category === 'help') {
      // atxp paas --help OR atxp paas help
      showPaasOverview();
    } else if (!subCommand || subCommand === 'help') {
      // atxp paas worker --help OR atxp paas worker help
      showCategoryHelp(category);
    } else {
      // atxp paas worker deploy --help
      // For dns record subcommands, check if there's a third arg
      if (category === 'dns' && subCommand === 'record' && restArgs[0]) {
        showCommandHelp(category, subCommand, restArgs[0]);
      } else {
        showCommandHelp(category, subCommand);
      }
    }
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

    case 'secrets':
      await handleSecretsCommand(subCommand, restArgs);
      break;

    default:
      console.error(chalk.red(`Unknown PAAS category: ${category}`));
      console.log('Available categories: worker, db, storage, dns, analytics, secrets');
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
        follow: options.follow,
        interval: options.interval,
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
  args: string[],
  options: PaasOptions
): Promise<void> {
  switch (subCommand) {
    case 'list':
      await analyticsListCommand();
      break;

    case 'schema': {
      const dataset = args[0];
      await analyticsSchemaCommand({ dataset });
      break;
    }

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
      console.log('Available commands: list, schema, query, events, stats');
      process.exit(1);
  }
}

async function handleSecretsCommand(
  subCommand: string,
  args: string[]
): Promise<void> {
  const workerName = args[0];

  switch (subCommand) {
    case 'set': {
      const keyValuePair = args[1];
      if (!workerName || !keyValuePair) {
        console.error(chalk.red('Error: Worker name and KEY=VALUE are required'));
        console.log(`Usage: ${chalk.cyan('npx atxp paas secrets set <worker> KEY=VALUE')}`);
        process.exit(1);
      }
      await secretsSetCommand(workerName, keyValuePair);
      break;
    }

    case 'list':
      if (!workerName) {
        console.error(chalk.red('Error: Worker name is required'));
        console.log(`Usage: ${chalk.cyan('npx atxp paas secrets list <worker>')}`);
        process.exit(1);
      }
      await secretsListCommand(workerName);
      break;

    case 'delete': {
      const key = args[1];
      if (!workerName || !key) {
        console.error(chalk.red('Error: Worker name and secret key are required'));
        console.log(`Usage: ${chalk.cyan('npx atxp paas secrets delete <worker> <key>')}`);
        process.exit(1);
      }
      await secretsDeleteCommand(workerName, key);
      break;
    }

    default:
      console.error(chalk.red(`Unknown secrets command: ${subCommand}`));
      console.log('Available commands: set, list, delete');
      process.exit(1);
  }
}
