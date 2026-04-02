import { callTool } from '../call-tool.js';
import chalk from 'chalk';

const SERVER = 'git.mcp.atxp.ai';

export interface GitOptions {
  writable?: boolean;
  ttl?: number;
  defaultBranch?: string;
  visibility?: string;
  limit?: number;
  cursor?: string;
}

export async function gitCommand(
  subCommand: string,
  options: GitOptions,
  positionalArg?: string
): Promise<void> {
  switch (subCommand) {
    case 'create': {
      if (!positionalArg) {
        console.error(chalk.red('Error: Repository name is required'));
        console.log(`Usage: ${chalk.cyan('npx atxp git create <repoName> [--visibility public|private] [--default-branch <branch>]')}`);
        process.exit(1);
      }
      const args: Record<string, unknown> = { repoName: positionalArg };
      if (options.visibility) args.visibility = options.visibility;
      if (options.defaultBranch) args.defaultBranch = options.defaultBranch;
      const result = await callTool(SERVER, 'git_create_repo', args);
      console.log(result);
      break;
    }

    case 'list': {
      const args: Record<string, unknown> = {};
      if (options.limit) args.limit = options.limit;
      if (options.cursor) args.cursor = options.cursor;
      const result = await callTool(SERVER, 'git_list_repos', args);
      console.log(result);
      break;
    }

    case 'remote-url': {
      if (!positionalArg) {
        console.error(chalk.red('Error: Repository name is required'));
        console.log(`Usage: ${chalk.cyan('npx atxp git remote-url <repoName> [--writable] [--ttl <seconds>]')}`);
        process.exit(1);
      }
      const args: Record<string, unknown> = { repoName: positionalArg };
      if (options.writable) args.writable = true;
      if (options.ttl) args.ttlSeconds = options.ttl;
      const result = await callTool(SERVER, 'git_get_remote_url', args);
      console.log(result);
      break;
    }

    case 'delete': {
      if (!positionalArg) {
        console.error(chalk.red('Error: Repository name is required'));
        console.log(`Usage: ${chalk.cyan('npx atxp git delete <repoName>')}`);
        process.exit(1);
      }
      const result = await callTool(SERVER, 'git_delete_repo', { repoName: positionalArg });
      console.log(result);
      break;
    }

    case 'help':
    case '':
      console.log(chalk.bold('Git Repository Management'));
      console.log();
      console.log(chalk.bold('Usage:'));
      console.log(`  npx atxp git ${chalk.yellow('<command>')} [options]`);
      console.log();
      console.log(chalk.bold('Commands:'));
      console.log(`  ${chalk.cyan('create')} ${chalk.yellow('<repoName>')}      Create a new repository ($0.50)`);
      console.log(`  ${chalk.cyan('list')}                    List your repositories (free)`);
      console.log(`  ${chalk.cyan('remote-url')} ${chalk.yellow('<repoName>')}  Get an authenticated clone/push URL`);
      console.log(`  ${chalk.cyan('delete')} ${chalk.yellow('<repoName>')}      Delete a repository (free)`);
      console.log(`  ${chalk.cyan('help')}                    Show this help message`);
      console.log();
      console.log(chalk.bold('Options:'));
      console.log(`  ${chalk.yellow('--writable')}              Request a writable URL ($0.01, default: read-only/free)`);
      console.log(`  ${chalk.yellow('--ttl')} ${chalk.yellow('<seconds>')}        URL expiry in seconds (default: 3600)`);
      console.log(`  ${chalk.yellow('--visibility')} ${chalk.yellow('<mode>')}    private or public (default: private)`);
      console.log(`  ${chalk.yellow('--default-branch')} ${chalk.yellow('<name>')} Default branch name (default: main)`);
      console.log(`  ${chalk.yellow('--limit')} ${chalk.yellow('<n>')}            Max repos to list (default: 20)`);
      console.log(`  ${chalk.yellow('--cursor')} ${chalk.yellow('<token>')}       Pagination cursor for list`);
      console.log();
      console.log(chalk.bold('Examples:'));
      console.log('  npx atxp git create my-project');
      console.log('  npx atxp git create my-project --visibility public');
      console.log('  npx atxp git list');
      console.log('  npx atxp git remote-url my-project --writable');
      console.log('  npx atxp git delete my-project');
      console.log();
      console.log(chalk.bold(chalk.yellow('Important: Remote URLs are ephemeral')));
      console.log('  URLs from remote-url contain a time-limited JWT (default: 1 hour).');
      console.log('  When expired, git operations return an auth error. Get a fresh URL:');
      console.log(`    ${chalk.cyan('npx atxp git remote-url my-project --writable')}`);
      console.log('  Then update the remote:');
      console.log(`    ${chalk.cyan('git remote set-url origin <new-url>')}`);
      break;

    default:
      console.error(chalk.red(`Unknown git command: ${subCommand}`));
      console.log(`Run ${chalk.cyan('npx atxp git help')} for available commands.`);
      process.exit(1);
  }
}
