import chalk from 'chalk';

// ============================================================================
// Types
// ============================================================================

interface CommandOption {
  flag: string;
  description: string;
  required?: boolean;
}

interface CommandExample {
  command: string;
  description?: string;
}

export interface CommandHelp {
  usage: string;
  description: string;
  options?: CommandOption[];
  examples: CommandExample[];
  related?: string[];
}

export interface CategoryInfo {
  name: string;
  description: string;
  commands: string[];
}

// ============================================================================
// Category Definitions
// ============================================================================

export const PAAS_CATEGORIES: CategoryInfo[] = [
  {
    name: 'worker',
    description: 'Deploy and manage serverless workers',
    commands: ['deploy', 'list', 'logs', 'delete'],
  },
  {
    name: 'db',
    description: 'Create and manage D1 databases',
    commands: ['create', 'list', 'query', 'delete'],
  },
  {
    name: 'storage',
    description: 'Manage R2 storage buckets and files',
    commands: ['create', 'list', 'upload', 'download', 'files', 'delete-bucket', 'delete-file'],
  },
  {
    name: 'dns',
    description: 'Manage domains and DNS records',
    commands: ['add', 'list', 'record', 'connect'],
  },
  {
    name: 'analytics',
    description: 'Query and analyze worker analytics',
    commands: ['list', 'schema', 'query', 'events', 'stats'],
  },
  {
    name: 'secrets',
    description: 'Manage worker secrets',
    commands: ['set', 'list', 'delete'],
  },
];

// ============================================================================
// Command Help Registry
// ============================================================================

export const COMMAND_HELP: Record<string, CommandHelp> = {
  // ---------------------------------------------------------------------------
  // Worker Commands
  // ---------------------------------------------------------------------------
  'worker.deploy': {
    usage: 'atxp paas worker deploy <name> [options]',
    description: 'Deploy a serverless worker with optional database, storage, and analytics bindings.',
    options: [
      { flag: '--code <file>', description: 'Path to worker code file', required: true },
      { flag: '--db <binding:name>', description: 'Bind a database (repeatable)' },
      { flag: '--bucket <binding:name>', description: 'Bind a storage bucket (repeatable)' },
      { flag: '--env KEY=VALUE', description: 'Set environment variable (repeatable)' },
      { flag: '--env-file <path>', description: 'Load env vars from file' },
      { flag: '--enable-analytics [NAME]', description: 'Enable Analytics Engine binding [default: ANALYTICS]' },
    ],
    examples: [
      { command: 'npx atxp paas worker deploy my-api --code ./worker.js' },
      { command: 'npx atxp paas worker deploy my-api --code ./worker.js --db DB:mydb' },
      { command: 'npx atxp paas worker deploy my-api --code ./worker.js --bucket STORAGE:mybucket' },
      { command: 'npx atxp paas worker deploy my-api --code ./worker.js --enable-analytics' },
      { command: 'npx atxp paas worker deploy my-api --code ./worker.js --env API_KEY=abc123' },
    ],
    related: ['worker list', 'worker logs', 'worker delete'],
  },
  'worker.list': {
    usage: 'atxp paas worker list',
    description: 'List all deployed workers in your account.',
    examples: [
      { command: 'npx atxp paas worker list' },
    ],
    related: ['worker deploy', 'worker logs', 'worker delete'],
  },
  'worker.logs': {
    usage: 'atxp paas worker logs <name> [options]',
    description: 'View logs for a deployed worker.',
    options: [
      { flag: '--follow, -f', description: 'Stream logs continuously (Ctrl+C to stop)' },
      { flag: '--interval <ms>', description: 'Polling interval in milliseconds [default: 2000]' },
      { flag: '--limit <n>', description: 'Number of log entries to show' },
      { flag: '--level <level>', description: 'Filter by log level (error, warn, info, debug)' },
      { flag: '--since <time>', description: 'Show logs since timestamp (e.g., 1h, 30m, 2024-01-01)' },
    ],
    examples: [
      { command: 'npx atxp paas worker logs my-api' },
      { command: 'npx atxp paas worker logs my-api --follow' },
      { command: 'npx atxp paas worker logs my-api -f --interval 500' },
      { command: 'npx atxp paas worker logs my-api --follow --level error' },
      { command: 'npx atxp paas worker logs my-api --limit 100' },
      { command: 'npx atxp paas worker logs my-api --level error' },
      { command: 'npx atxp paas worker logs my-api --since 1h' },
    ],
    related: ['worker list', 'worker deploy'],
  },
  'worker.delete': {
    usage: 'atxp paas worker delete <name>',
    description: 'Delete a deployed worker.',
    examples: [
      { command: 'npx atxp paas worker delete my-api' },
    ],
    related: ['worker list', 'worker deploy'],
  },

  // ---------------------------------------------------------------------------
  // Database Commands
  // ---------------------------------------------------------------------------
  'db.create': {
    usage: 'atxp paas db create <name>',
    description: 'Create a new D1 database.',
    examples: [
      { command: 'npx atxp paas db create my-database' },
    ],
    related: ['db list', 'db query', 'db delete'],
  },
  'db.list': {
    usage: 'atxp paas db list',
    description: 'List all databases in your account.',
    examples: [
      { command: 'npx atxp paas db list' },
    ],
    related: ['db create', 'db query', 'db delete'],
  },
  'db.query': {
    usage: 'atxp paas db query <database> [options]',
    description: 'Execute a SQL query against a database.',
    options: [
      { flag: '--sql <query>', description: 'SQL query to execute', required: true },
      { flag: '--params <json>', description: 'JSON array of query parameters' },
    ],
    examples: [
      { command: 'npx atxp paas db query my-database --sql "SELECT * FROM users"' },
      { command: 'npx atxp paas db query my-database --sql "SELECT * FROM users WHERE id = ?" --params \'[1]\'' },
      { command: 'npx atxp paas db query my-database --sql "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)"' },
    ],
    related: ['db create', 'db list'],
  },
  'db.delete': {
    usage: 'atxp paas db delete <name>',
    description: 'Delete a database.',
    examples: [
      { command: 'npx atxp paas db delete my-database' },
    ],
    related: ['db list', 'db create'],
  },

  // ---------------------------------------------------------------------------
  // Storage Commands
  // ---------------------------------------------------------------------------
  'storage.create': {
    usage: 'atxp paas storage create <name>',
    description: 'Create a new R2 storage bucket.',
    examples: [
      { command: 'npx atxp paas storage create my-bucket' },
    ],
    related: ['storage list', 'storage upload', 'storage delete-bucket'],
  },
  'storage.list': {
    usage: 'atxp paas storage list',
    description: 'List all storage buckets in your account.',
    examples: [
      { command: 'npx atxp paas storage list' },
    ],
    related: ['storage create', 'storage files'],
  },
  'storage.upload': {
    usage: 'atxp paas storage upload <bucket> <key> [options]',
    description: 'Upload a file to a storage bucket.',
    options: [
      { flag: '--file <path>', description: 'Path to file to upload' },
      { flag: '--content <text>', description: 'Text content to upload directly' },
    ],
    examples: [
      { command: 'npx atxp paas storage upload my-bucket images/logo.png --file ./logo.png' },
      { command: 'npx atxp paas storage upload my-bucket config.json --content \'{"key": "value"}\'' },
    ],
    related: ['storage download', 'storage files', 'storage delete-file'],
  },
  'storage.download': {
    usage: 'atxp paas storage download <bucket> <key> [options]',
    description: 'Download a file from a storage bucket.',
    options: [
      { flag: '--output <path>', description: 'Output file path (default: prints to stdout)' },
    ],
    examples: [
      { command: 'npx atxp paas storage download my-bucket images/logo.png' },
      { command: 'npx atxp paas storage download my-bucket images/logo.png --output ./logo.png' },
    ],
    related: ['storage upload', 'storage files'],
  },
  'storage.files': {
    usage: 'atxp paas storage files <bucket> [options]',
    description: 'List files in a storage bucket.',
    options: [
      { flag: '--prefix <path>', description: 'Filter by key prefix' },
      { flag: '--limit <n>', description: 'Maximum number of files to list' },
    ],
    examples: [
      { command: 'npx atxp paas storage files my-bucket' },
      { command: 'npx atxp paas storage files my-bucket --prefix images/' },
      { command: 'npx atxp paas storage files my-bucket --limit 50' },
    ],
    related: ['storage upload', 'storage download'],
  },
  'storage.delete-bucket': {
    usage: 'atxp paas storage delete-bucket <name>',
    description: 'Delete a storage bucket.',
    examples: [
      { command: 'npx atxp paas storage delete-bucket my-bucket' },
    ],
    related: ['storage list', 'storage create'],
  },
  'storage.delete-file': {
    usage: 'atxp paas storage delete-file <bucket> <key>',
    description: 'Delete a file from a storage bucket.',
    examples: [
      { command: 'npx atxp paas storage delete-file my-bucket images/logo.png' },
    ],
    related: ['storage files', 'storage upload'],
  },

  // ---------------------------------------------------------------------------
  // DNS Commands
  // ---------------------------------------------------------------------------
  'dns.add': {
    usage: 'atxp paas dns add <domain>',
    description: 'Add a domain to your account for management.',
    examples: [
      { command: 'npx atxp paas dns add example.com' },
    ],
    related: ['dns list', 'dns connect', 'dns record create'],
  },
  'dns.list': {
    usage: 'atxp paas dns list',
    description: 'List all domains in your account.',
    examples: [
      { command: 'npx atxp paas dns list' },
    ],
    related: ['dns add', 'dns record list'],
  },
  'dns.record': {
    usage: 'atxp paas dns record <subcommand> [options]',
    description: 'Manage DNS records for a domain.',
    examples: [
      { command: 'npx atxp paas dns record create example.com --type A --name www --record-content 1.2.3.4' },
      { command: 'npx atxp paas dns record list example.com' },
      { command: 'npx atxp paas dns record delete example.com <record-id>' },
    ],
    related: ['dns add', 'dns list', 'dns connect'],
  },
  'dns.record.create': {
    usage: 'atxp paas dns record create <domain> [options]',
    description: 'Create a DNS record for a domain.',
    options: [
      { flag: '--type <type>', description: 'Record type (A, AAAA, CNAME, TXT, MX, etc.)', required: true },
      { flag: '--name <name>', description: 'Record name (e.g., www, @)', required: true },
      { flag: '--record-content <value>', description: 'Record content (IP, hostname, text)', required: true },
      { flag: '--ttl <seconds>', description: 'Time to live in seconds' },
      { flag: '--proxied', description: 'Enable Cloudflare proxy (A/AAAA/CNAME only)' },
      { flag: '--priority <n>', description: 'Priority (MX records only)' },
    ],
    examples: [
      { command: 'npx atxp paas dns record create example.com --type A --name www --record-content 1.2.3.4' },
      { command: 'npx atxp paas dns record create example.com --type CNAME --name blog --record-content blog.example.com' },
      { command: 'npx atxp paas dns record create example.com --type TXT --name @ --record-content "v=spf1 include:_spf.google.com ~all"' },
      { command: 'npx atxp paas dns record create example.com --type MX --name @ --record-content mail.example.com --priority 10' },
    ],
    related: ['dns record list', 'dns record delete'],
  },
  'dns.record.list': {
    usage: 'atxp paas dns record list <domain> [options]',
    description: 'List DNS records for a domain.',
    options: [
      { flag: '--type <type>', description: 'Filter by record type' },
    ],
    examples: [
      { command: 'npx atxp paas dns record list example.com' },
      { command: 'npx atxp paas dns record list example.com --type A' },
    ],
    related: ['dns record create', 'dns record delete'],
  },
  'dns.record.delete': {
    usage: 'atxp paas dns record delete <domain> <record-id>',
    description: 'Delete a DNS record.',
    examples: [
      { command: 'npx atxp paas dns record delete example.com abc123' },
    ],
    related: ['dns record list', 'dns record create'],
  },
  'dns.connect': {
    usage: 'atxp paas dns connect <domain> <worker> [options]',
    description: 'Connect a domain to a worker for routing.',
    options: [
      { flag: '--subdomain <name>', description: 'Subdomain to connect (default: root domain)' },
    ],
    examples: [
      { command: 'npx atxp paas dns connect example.com my-api' },
      { command: 'npx atxp paas dns connect example.com my-api --subdomain api' },
    ],
    related: ['dns add', 'dns list', 'worker deploy'],
  },

  // ---------------------------------------------------------------------------
  // Analytics Commands
  // ---------------------------------------------------------------------------
  'analytics.list': {
    usage: 'atxp paas analytics list',
    description: 'List all analytics datasets in your account.',
    examples: [
      { command: 'npx atxp paas analytics list' },
    ],
    related: ['analytics schema', 'analytics query'],
  },
  'analytics.schema': {
    usage: 'atxp paas analytics schema [dataset]',
    description: 'Show the schema (columns) for an analytics dataset.',
    examples: [
      { command: 'npx atxp paas analytics schema' },
      { command: 'npx atxp paas analytics schema my-dataset' },
    ],
    related: ['analytics list', 'analytics query'],
  },
  'analytics.query': {
    usage: 'atxp paas analytics query [options]',
    description: 'Execute a SQL query against analytics data.',
    options: [
      { flag: '--sql <query>', description: 'SQL query to execute' },
      { flag: '--range <period>', description: 'Time range (e.g., 1h, 24h, 7d, 30d)' },
    ],
    examples: [
      { command: 'npx atxp paas analytics query --sql "SELECT * FROM events LIMIT 10"' },
      { command: 'npx atxp paas analytics query --sql "SELECT COUNT(*) FROM events" --range 24h' },
    ],
    related: ['analytics schema', 'analytics events', 'analytics stats'],
  },
  'analytics.events': {
    usage: 'atxp paas analytics events [options]',
    description: 'List analytics events.',
    options: [
      { flag: '--event <name>', description: 'Filter by event name' },
      { flag: '--limit <n>', description: 'Maximum number of events to show' },
      { flag: '--range <period>', description: 'Time range (e.g., 1h, 24h, 7d, 30d)' },
    ],
    examples: [
      { command: 'npx atxp paas analytics events' },
      { command: 'npx atxp paas analytics events --event page_view' },
      { command: 'npx atxp paas analytics events --limit 50 --range 1h' },
    ],
    related: ['analytics query', 'analytics stats'],
  },
  'analytics.stats': {
    usage: 'atxp paas analytics stats [options]',
    description: 'Get aggregated analytics statistics.',
    options: [
      { flag: '--group-by <field>', description: 'Group results by field' },
      { flag: '--range <period>', description: 'Time range (e.g., 1h, 24h, 7d, 30d)' },
    ],
    examples: [
      { command: 'npx atxp paas analytics stats' },
      { command: 'npx atxp paas analytics stats --group-by event_name' },
      { command: 'npx atxp paas analytics stats --range 7d' },
    ],
    related: ['analytics query', 'analytics events'],
  },

  // ---------------------------------------------------------------------------
  // Secrets Commands
  // ---------------------------------------------------------------------------
  'secrets.set': {
    usage: 'atxp paas secrets set <worker> KEY=VALUE',
    description: 'Set a secret for a worker. The value is stored securely and available at runtime.',
    examples: [
      { command: 'npx atxp paas secrets set my-api API_KEY=sk-abc123' },
      { command: 'npx atxp paas secrets set my-api DATABASE_URL="postgres://user:pass@host/db"' },
    ],
    related: ['secrets list', 'secrets delete'],
  },
  'secrets.list': {
    usage: 'atxp paas secrets list <worker>',
    description: 'List all secrets for a worker. Values are not displayed for security.',
    examples: [
      { command: 'npx atxp paas secrets list my-api' },
    ],
    related: ['secrets set', 'secrets delete'],
  },
  'secrets.delete': {
    usage: 'atxp paas secrets delete <worker> <key>',
    description: 'Delete a secret from a worker.',
    examples: [
      { command: 'npx atxp paas secrets delete my-api API_KEY' },
    ],
    related: ['secrets list', 'secrets set'],
  },
};

// ============================================================================
// Rendering Functions
// ============================================================================

/**
 * Show the top-level PAAS help (categories overview)
 */
export function showPaasOverview(): void {
  console.log();
  console.log(chalk.bold('ATXP PAAS - Platform as a Service'));
  console.log(chalk.gray('Deploy workers, databases, storage, and more to Cloudflare'));
  console.log();

  console.log(chalk.bold('Usage:'));
  console.log('  npx atxp paas <category> <command> [options]');
  console.log();

  console.log(chalk.bold('Categories:'));
  for (const category of PAAS_CATEGORIES) {
    console.log(`  ${chalk.cyan(category.name.padEnd(12))} ${category.description}`);
  }
  console.log();

  console.log(chalk.bold('Getting Help:'));
  console.log(`  npx atxp paas ${chalk.cyan('--help')}              Show this overview`);
  console.log(`  npx atxp paas ${chalk.cyan('<category>')} --help   Show category commands`);
  console.log(`  npx atxp paas ${chalk.cyan('<category> <cmd>')} --help  Show command options`);
  console.log();

  console.log(chalk.bold('Quick Start:'));
  console.log('  npx atxp paas worker deploy my-api --code ./worker.js');
  console.log('  npx atxp paas db create my-database');
  console.log('  npx atxp paas storage create my-bucket');
  console.log();
}

/**
 * Show help for a category (list of commands in that category)
 */
export function showCategoryHelp(category: string): void {
  const categoryInfo = PAAS_CATEGORIES.find((c) => c.name === category);

  if (!categoryInfo) {
    console.error(chalk.red(`Unknown category: ${category}`));
    console.log();
    console.log('Available categories:');
    for (const c of PAAS_CATEGORIES) {
      console.log(`  ${chalk.cyan(c.name)}`);
    }
    process.exit(1);
  }

  console.log();
  console.log(chalk.bold(`ATXP PAAS ${category.toUpperCase()} Commands`));
  console.log(chalk.gray(categoryInfo.description));
  console.log();

  console.log(chalk.bold('Commands:'));
  for (const cmd of categoryInfo.commands) {
    const helpKey = `${category}.${cmd}`;
    const help = COMMAND_HELP[helpKey];
    if (help) {
      // Extract the short description (first sentence)
      const shortDesc = help.description.split('.')[0] + '.';
      console.log(`  ${chalk.cyan(cmd.padEnd(16))} ${shortDesc}`);
    }
  }
  console.log();

  console.log(chalk.bold('Getting Help:'));
  console.log(`  npx atxp paas ${category} ${chalk.cyan('<command>')} --help   Show command options`);
  console.log();

  // Show quick example
  const firstCmd = categoryInfo.commands[0];
  const firstHelp = COMMAND_HELP[`${category}.${firstCmd}`];
  if (firstHelp && firstHelp.examples.length > 0) {
    console.log(chalk.bold('Example:'));
    console.log(`  ${firstHelp.examples[0].command}`);
    console.log();
  }
}

/**
 * Show help for a specific command
 */
export function showCommandHelp(category: string, command: string, subCommand?: string): void {
  // Build the help key, handling nested commands like dns.record.create
  let helpKey = `${category}.${command}`;
  if (subCommand) {
    helpKey = `${category}.${command}.${subCommand}`;
  }

  const help = COMMAND_HELP[helpKey];

  if (!help) {
    // Check if this is a category with subcommands (like dns.record)
    const parentHelp = COMMAND_HELP[`${category}.${command}`];
    if (parentHelp) {
      showCommandHelpContent(parentHelp);
      return;
    }

    console.error(chalk.red(`Unknown command: ${category} ${command}${subCommand ? ' ' + subCommand : ''}`));
    console.log();

    // Show available commands for the category
    const categoryInfo = PAAS_CATEGORIES.find((c) => c.name === category);
    if (categoryInfo) {
      console.log(`Available ${category} commands:`);
      for (const cmd of categoryInfo.commands) {
        console.log(`  ${chalk.cyan(cmd)}`);
      }
    }
    process.exit(1);
  }

  showCommandHelpContent(help);
}

/**
 * Render the help content for a command
 */
function showCommandHelpContent(help: CommandHelp): void {
  console.log();
  console.log(chalk.bold('Usage:'));
  console.log(`  ${help.usage}`);
  console.log();

  console.log(help.description);
  console.log();

  if (help.options && help.options.length > 0) {
    console.log(chalk.bold('Options:'));
    for (const opt of help.options) {
      const requiredTag = opt.required ? chalk.red(' (required)') : '';
      console.log(`  ${chalk.cyan(opt.flag.padEnd(28))} ${opt.description}${requiredTag}`);
    }
    console.log();
  }

  if (help.examples.length > 0) {
    console.log(chalk.bold('Examples:'));
    for (const example of help.examples) {
      console.log(`  $ ${example.command}`);
      if (example.description) {
        console.log(`    ${chalk.gray(example.description)}`);
      }
    }
    console.log();
  }

  if (help.related && help.related.length > 0) {
    console.log(chalk.bold('Related:'));
    console.log(`  ${help.related.join(', ')}`);
    console.log();
  }
}
