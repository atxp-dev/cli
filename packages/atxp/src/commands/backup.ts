import chalk from 'chalk';
import fs from 'fs';
import JSZip from 'jszip';
import path from 'path';
import { getConnection } from '../config.js';

export interface BackupOptions {
  path?: string;
}

interface BackupFile {
  path: string;
  content: string;
}

function getAccountsAuth(): { baseUrl: string; token: string } {
  const connection = getConnection();
  if (!connection) {
    console.error(chalk.red('Not logged in.'));
    console.error(`Run: ${chalk.cyan('npx atxp login')}`);
    process.exit(1);
  }
  const url = new URL(connection);
  const token = url.searchParams.get('connection_token');
  if (!token) {
    console.error(chalk.red('Invalid connection string: missing connection_token'));
    process.exit(1);
  }
  return { baseUrl: `${url.protocol}//${url.host}`, token };
}

function showBackupHelp(): void {
  console.log(chalk.bold('Backup Commands:'));
  console.log();
  console.log('  ' + chalk.cyan('npx atxp backup push --path <dir>') + '   ' + 'Push .md files to server');
  console.log('  ' + chalk.cyan('npx atxp backup pull --path <dir>') + '   ' + 'Pull .md files from server');
  console.log('  ' + chalk.cyan('npx atxp backup status') + '              ' + 'Show backup info');
  console.log();
  console.log(chalk.bold('Details:'));
  console.log('  Backs up all .md files (recursively) from the given directory.');
  console.log('  Files are compressed into a zip archive before upload.');
  console.log('  Each push replaces the previous server snapshot entirely.');
  console.log('  Pull writes server files to the local directory (non-destructive).');
  console.log();
  console.log(chalk.bold('Options:'));
  console.log('  ' + chalk.yellow('--path') + '  ' + 'Directory to push from or pull to (required for push/pull)');
  console.log();
  console.log(chalk.bold('Examples:'));
  console.log('  npx atxp backup push --path ~/.openclaw/workspace-abc/');
  console.log('  npx atxp backup pull --path ~/.openclaw/workspace-abc/');
  console.log('  npx atxp backup status');
}

export function collectMdFiles(dir: string): BackupFile[] {
  const entries = fs.readdirSync(dir, { recursive: true, withFileTypes: true });
  const files: BackupFile[] = [];

  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith('.md')) continue;

    const parentPath = entry.parentPath ?? entry.path;
    const fullPath = path.join(parentPath, entry.name);
    const relativePath = path.relative(dir, fullPath);
    const content = fs.readFileSync(fullPath, 'utf-8');

    files.push({ path: relativePath, content });
  }

  return files;
}

async function pushBackup(pathArg: string): Promise<void> {
  if (!pathArg) {
    console.error(chalk.red('Error: --path is required for push'));
    console.error(`Usage: ${chalk.cyan('npx atxp backup push --path <dir>')}`);
    process.exit(1);
  }

  const resolvedPath = path.resolve(pathArg);

  if (!fs.existsSync(resolvedPath)) {
    console.error(chalk.red(`Error: Directory does not exist: ${resolvedPath}`));
    process.exit(1);
  }

  if (!fs.statSync(resolvedPath).isDirectory()) {
    console.error(chalk.red(`Error: Path is not a directory: ${resolvedPath}`));
    process.exit(1);
  }

  const { baseUrl, token } = getAccountsAuth();

  console.log(chalk.gray(`Collecting .md files from ${resolvedPath}...`));

  const files = collectMdFiles(resolvedPath);

  if (files.length === 0) {
    console.log(chalk.yellow('No .md files found in the specified directory.'));
    return;
  }

  for (const file of files) {
    console.log(chalk.gray(`  ${file.path}`));
  }

  const totalBytes = files.reduce((sum, f) => sum + Buffer.byteLength(f.content, 'utf-8'), 0);
  console.log(chalk.gray(`\nCompressing ${files.length} file(s) (${formatBytes(totalBytes)})...`));

  const zip = new JSZip();
  for (const file of files) {
    zip.file(file.path, file.content);
  }
  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });

  console.log(chalk.gray(`Pushing zip archive (${formatBytes(zipBuffer.length)})...`));

  const res = await fetch(`${baseUrl}/backup/files`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/zip',
    },
    body: new Uint8Array(zipBuffer),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.error(chalk.red(`Error: ${(body as Record<string, string>).error || res.statusText}`));
    process.exit(1);
  }

  const data = await res.json() as { fileCount: number; syncedAt: string };

  console.log();
  console.log(chalk.green.bold('Backup pushed successfully!'));
  console.log('  ' + chalk.bold('Files:') + '     ' + data.fileCount);
  console.log('  ' + chalk.bold('Synced at:') + ' ' + new Date(data.syncedAt).toLocaleString());
}

async function pullBackup(pathArg: string): Promise<void> {
  if (!pathArg) {
    console.error(chalk.red('Error: --path is required for pull'));
    console.error(`Usage: ${chalk.cyan('npx atxp backup pull --path <dir>')}`);
    process.exit(1);
  }

  const resolvedPath = path.resolve(pathArg);
  const { baseUrl, token } = getAccountsAuth();

  console.log(chalk.gray('Pulling backup from server...'));

  const res = await fetch(`${baseUrl}/backup/files`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/zip',
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.error(chalk.red(`Error: ${(body as Record<string, string>).error || res.statusText}`));
    process.exit(1);
  }

  const zipBuffer = Buffer.from(await res.arrayBuffer());

  if (zipBuffer.length === 0) {
    console.log(chalk.yellow('No backup found on server. Push one first with:'));
    console.log(chalk.cyan('  npx atxp backup push --path <dir>'));
    return;
  }

  console.log(chalk.gray(`Extracting zip archive (${formatBytes(zipBuffer.length)})...`));

  const zip = await JSZip.loadAsync(zipBuffer);
  const fileNames = Object.keys(zip.files).filter(name => !zip.files[name].dir);

  if (fileNames.length === 0) {
    console.log(chalk.yellow('No backup found on server. Push one first with:'));
    console.log(chalk.cyan('  npx atxp backup push --path <dir>'));
    return;
  }

  // Create target directory if needed
  fs.mkdirSync(resolvedPath, { recursive: true });

  for (const name of fileNames) {
    const content = await zip.files[name].async('string');
    const filePath = path.join(resolvedPath, name);
    const fileDir = path.dirname(filePath);

    fs.mkdirSync(fileDir, { recursive: true });
    fs.writeFileSync(filePath, content, 'utf-8');

    console.log(chalk.gray(`  ${name}`));
  }

  console.log();
  console.log(chalk.green.bold('Backup pulled successfully!'));
  console.log('  ' + chalk.bold('Files written:') + ' ' + fileNames.length);
  console.log('  ' + chalk.bold('Directory:') + '     ' + resolvedPath);
}

async function backupStatus(): Promise<void> {
  const { baseUrl, token } = getAccountsAuth();

  const res = await fetch(`${baseUrl}/backup/status`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.error(chalk.red(`Error: ${(body as Record<string, string>).error || res.statusText}`));
    process.exit(1);
  }

  const data = await res.json() as { fileCount: number; syncedAt: string; totalBytes: number };

  console.log(chalk.bold('Backup Status'));
  console.log();

  if (data.fileCount === 0) {
    console.log(chalk.gray('No backup found.'));
    console.log();
    console.log('Create one with: ' + chalk.cyan('npx atxp backup push --path <dir>'));
    return;
  }

  console.log('  ' + chalk.bold('Files:') + '       ' + data.fileCount);
  console.log('  ' + chalk.bold('Total size:') + '  ' + formatBytes(data.totalBytes));
  console.log('  ' + chalk.bold('Last sync:') + '   ' + new Date(data.syncedAt).toLocaleString());
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function backupCommand(subCommand: string, options: BackupOptions): Promise<void> {
  if (!subCommand || subCommand === 'help' || subCommand === '--help' || subCommand === '-h') {
    showBackupHelp();
    return;
  }

  switch (subCommand) {
    case 'push':
      await pushBackup(options.path || '');
      break;

    case 'pull':
      await pullBackup(options.path || '');
      break;

    case 'status':
      await backupStatus();
      break;

    default:
      console.error(chalk.red(`Unknown backup command: ${subCommand}`));
      console.log();
      showBackupHelp();
      process.exit(1);
  }
}
