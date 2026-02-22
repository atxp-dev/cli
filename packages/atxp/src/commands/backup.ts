import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { callTool } from '../call-tool.js';

const SERVER = 'backup.mcp.atxp.ai';

/**
 * Known OpenClaw agent identity and memory files.
 * These are the only files eligible for free backup.
 */
const KNOWN_ROOT_FILES = [
  'SOUL.md',
  'AGENTS.md',
  'USER.md',
  'IDENTITY.md',
  'TOOLS.md',
  'HEARTBEAT.md',
  'BOOT.md',
  'BOOTSTRAP.md',
  'MEMORY.md',
];

const MEMORY_DIR = 'memory';

interface BackupFile {
  path: string;
  content: string;
}

function getWorkspaceDir(): string {
  const dirArg = getArgValue('--dir');
  return dirArg ? path.resolve(dirArg) : process.cwd();
}

function getArgValue(flag: string): string | undefined {
  const index = process.argv.findIndex((arg) => arg === flag);
  return index !== -1 && process.argv[index + 1] ? process.argv[index + 1] : undefined;
}

/**
 * Discover all eligible .md files in the workspace.
 * Returns files with paths relative to the workspace root.
 */
function discoverFiles(workspaceDir: string): BackupFile[] {
  const files: BackupFile[] = [];

  // Scan for known root-level files
  for (const filename of KNOWN_ROOT_FILES) {
    const filePath = path.join(workspaceDir, filename);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        files.push({ path: filename, content });
      } catch {
        // Skip files we can't read
      }
    }
  }

  // Scan memory/ directory for daily logs
  const memoryDir = path.join(workspaceDir, MEMORY_DIR);
  if (fs.existsSync(memoryDir) && fs.statSync(memoryDir).isDirectory()) {
    try {
      const entries = fs.readdirSync(memoryDir);
      for (const entry of entries) {
        if (!entry.endsWith('.md')) continue;
        const filePath = path.join(memoryDir, entry);
        try {
          if (fs.statSync(filePath).isFile()) {
            const content = fs.readFileSync(filePath, 'utf-8');
            files.push({ path: `${MEMORY_DIR}/${entry}`, content });
          }
        } catch {
          // Skip files we can't read
        }
      }
    } catch {
      // Skip if we can't read the directory
    }
  }

  return files;
}

function showBackupHelp(): void {
  console.log(chalk.bold('Backup Commands:'));
  console.log();
  console.log('  ' + chalk.cyan('npx atxp backup push') + '               ' + 'Back up agent files to ATXP');
  console.log('  ' + chalk.cyan('npx atxp backup pull') + '               ' + 'Restore agent files from backup');
  console.log('  ' + chalk.cyan('npx atxp backup list') + '               ' + 'List available backup snapshots');
  console.log('  ' + chalk.cyan('npx atxp backup status') + '             ' + 'Show files that would be backed up');
  console.log();
  console.log(chalk.bold('Options:'));
  console.log('  ' + chalk.yellow('--dir <path>') + '       ' + 'Workspace directory (default: current directory)');
  console.log('  ' + chalk.yellow('--snapshot <id>') + '    ' + 'Restore a specific snapshot (for pull)');
  console.log();
  console.log(chalk.bold('Eligible Files:'));
  console.log('  Only known OpenClaw agent .md files are backed up:');
  console.log('  SOUL.md, AGENTS.md, USER.md, IDENTITY.md, TOOLS.md,');
  console.log('  HEARTBEAT.md, BOOT.md, BOOTSTRAP.md, MEMORY.md,');
  console.log('  and all .md files in the memory/ directory.');
  console.log();
  console.log(chalk.bold('Examples:'));
  console.log('  npx atxp backup status                 # See what would be backed up');
  console.log('  npx atxp backup push                   # Back up from current directory');
  console.log('  npx atxp backup push --dir ~/workspace  # Back up from specific directory');
  console.log('  npx atxp backup list                   # List snapshots');
  console.log('  npx atxp backup pull                   # Restore latest snapshot');
  console.log('  npx atxp backup pull --snapshot abc123  # Restore specific snapshot');
}

export async function backupCommand(subCommand: string): Promise<void> {
  if (!subCommand || subCommand === 'help' || subCommand === '--help' || subCommand === '-h') {
    showBackupHelp();
    return;
  }

  switch (subCommand) {
    case 'push':
      await backupPush();
      break;

    case 'pull':
      await backupPull();
      break;

    case 'list':
      await backupList();
      break;

    case 'status':
      backupStatus();
      break;

    default:
      console.error(chalk.red(`Unknown backup command: ${subCommand}`));
      console.log();
      showBackupHelp();
      process.exit(1);
  }
}

async function backupPush(): Promise<void> {
  const workspaceDir = getWorkspaceDir();
  const files = discoverFiles(workspaceDir);

  if (files.length === 0) {
    console.error(chalk.red('No eligible files found to back up.'));
    console.log();
    console.log('Looked in: ' + chalk.cyan(workspaceDir));
    console.log('Expected files like SOUL.md, AGENTS.md, memory/*.md, etc.');
    console.log();
    console.log('Use ' + chalk.yellow('--dir <path>') + ' to specify a different workspace directory.');
    process.exit(1);
  }

  console.log(chalk.gray(`Backing up ${files.length} file(s) from ${workspaceDir}...`));
  for (const file of files) {
    console.log('  ' + chalk.cyan(file.path));
  }

  const result = await callTool(SERVER, 'backup_push', {
    files: files.map((f) => ({ path: f.path, content: f.content })),
  });

  console.log();
  console.log(result);
}

async function backupPull(): Promise<void> {
  const workspaceDir = getWorkspaceDir();
  const snapshotId = getArgValue('--snapshot');

  console.log(chalk.gray(`Restoring backup to ${workspaceDir}...`));

  const args: Record<string, unknown> = {};
  if (snapshotId) {
    args.snapshot_id = snapshotId;
  }

  const result = await callTool(SERVER, 'backup_pull', args);

  // The server returns JSON with the file contents
  let snapshot: { files: BackupFile[]; snapshot_id?: string };
  try {
    snapshot = JSON.parse(result);
  } catch {
    // If the result isn't JSON, it's likely an error message
    console.log(result);
    return;
  }

  if (!snapshot.files || snapshot.files.length === 0) {
    console.log(chalk.yellow('No files found in backup.'));
    return;
  }

  if (snapshot.snapshot_id) {
    console.log(chalk.gray(`Snapshot: ${snapshot.snapshot_id}`));
  }

  for (const file of snapshot.files) {
    const filePath = path.join(workspaceDir, file.path);
    const fileDir = path.dirname(filePath);

    // Validate the path doesn't escape the workspace
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(path.resolve(workspaceDir))) {
      console.error(chalk.red(`Skipping ${file.path}: path escapes workspace directory`));
      continue;
    }

    // Create parent directories if needed (e.g., memory/)
    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true });
    }

    const existed = fs.existsSync(filePath);
    fs.writeFileSync(filePath, file.content, 'utf-8');

    if (existed) {
      console.log('  ' + chalk.yellow('overwrote') + ' ' + file.path);
    } else {
      console.log('  ' + chalk.green('created') + '   ' + file.path);
    }
  }

  console.log();
  console.log(chalk.green(`Restored ${snapshot.files.length} file(s).`));
}

async function backupList(): Promise<void> {
  const result = await callTool(SERVER, 'backup_list', {});
  console.log(result);
}

function backupStatus(): void {
  const workspaceDir = getWorkspaceDir();
  const files = discoverFiles(workspaceDir);

  console.log(chalk.bold('Backup Status'));
  console.log(chalk.gray(`Workspace: ${workspaceDir}`));
  console.log();

  if (files.length === 0) {
    console.log(chalk.yellow('No eligible files found.'));
    console.log();
    console.log('Expected files like SOUL.md, AGENTS.md, memory/*.md, etc.');
    console.log('Use ' + chalk.yellow('--dir <path>') + ' to specify a different workspace directory.');
    return;
  }

  let totalSize = 0;
  console.log(chalk.bold('Files that would be backed up:'));
  for (const file of files) {
    const size = Buffer.byteLength(file.content, 'utf-8');
    totalSize += size;
    const sizeStr = size < 1024 ? `${size} B` : `${(size / 1024).toFixed(1)} KB`;
    console.log('  ' + chalk.cyan(file.path) + chalk.gray(` (${sizeStr})`));
  }

  console.log();
  const totalStr = totalSize < 1024 ? `${totalSize} B` : `${(totalSize / 1024).toFixed(1)} KB`;
  console.log(`${files.length} file(s), ${totalStr} total`);
}
