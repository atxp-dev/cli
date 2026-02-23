import chalk from 'chalk';
import fs from 'fs';
import ignore, { type Ignore } from 'ignore';
import JSZip from 'jszip';
import os from 'os';
import path from 'path';
import { getConnection } from '../config.js';

export interface MemoryOptions {
  path?: string;
  topk?: number;
}

interface MemoryFile {
  path: string;
  content: string;
}

// --- Shared auth helper ---

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

// --- File collection ---

const ALWAYS_SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.hg',
  '.svn',
  '.atxp-memory-index',
  '__pycache__',
  '.DS_Store',
  'dist',
  'build',
  '.next',
  '.cache',
  '.venv',
  'venv',
]);

const MAX_FILES = 500;

function isBinary(buffer: Buffer): boolean {
  // Check the first 8KB for null bytes — a simple heuristic for binary files
  const len = Math.min(buffer.length, 8192);
  for (let i = 0; i < len; i++) {
    if (buffer[i] === 0) return true;
  }
  return false;
}

export function collectFiles(dir: string): MemoryFile[] {
  const files: MemoryFile[] = [];

  // Build a single Ignore instance that maps all .gitignore patterns to root-relative paths
  function loadIgnoreRules(rootDir: string): Ignore {
    const ig = ignore();

    function scanForGitignores(currentDir: string): void {
      const gitignorePath = path.join(currentDir, '.gitignore');
      if (fs.existsSync(gitignorePath)) {
        const prefix = path.relative(rootDir, currentDir);
        const rules = fs.readFileSync(gitignorePath, 'utf-8');
        for (const line of rules.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          // Prefix the pattern so it matches root-relative paths
          if (prefix) {
            ig.add(prefix + '/' + trimmed);
          } else {
            ig.add(trimmed);
          }
        }
      }

      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(currentDir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
        if (ALWAYS_SKIP_DIRS.has(entry.name)) continue;
        scanForGitignores(path.join(currentDir, entry.name));
      }
    }

    scanForGitignores(rootDir);
    return ig;
  }

  function walk(currentDir: string, ig: Ignore): void {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return; // permission denied, etc.
    }

    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;

      const name = entry.name;

      if (entry.isDirectory()) {
        if (ALWAYS_SKIP_DIRS.has(name)) continue;
        const relDir = path.relative(dir, path.join(currentDir, name)) + '/';
        if (ig.ignores(relDir)) continue;
        walk(path.join(currentDir, name), ig);
        if (files.length >= MAX_FILES) return;
        continue;
      }

      if (!entry.isFile()) continue;
      if (files.length >= MAX_FILES) return;

      const fullPath = path.join(currentDir, name);
      const relativePath = path.relative(dir, fullPath);

      if (ig.ignores(relativePath)) continue;

      // Skip binary files
      let buf: Buffer;
      try {
        buf = fs.readFileSync(fullPath);
      } catch {
        continue;
      }
      if (isBinary(buf)) continue;

      files.push({ path: relativePath, content: buf.toString('utf-8') });
    }
  }

  const ig = loadIgnoreRules(dir);
  walk(dir, ig);

  return files;
}

/** @deprecated Use collectFiles instead */
export const collectMdFiles = collectFiles;

// --- Text chunking ---

interface TextChunk {
  filePath: string;
  heading: string;
  text: string;
  startLine: number;
}

export function chunkMarkdown(filePath: string, content: string): TextChunk[] {
  const lines = content.split('\n');
  const chunks: TextChunk[] = [];
  let currentHeading = filePath;
  let currentLines: string[] = [];
  let chunkStartLine = 1;

  const flushChunk = () => {
    const text = currentLines.join('\n').trim();
    if (text.length > 0) {
      chunks.push({
        filePath,
        heading: currentHeading,
        text,
        startLine: chunkStartLine,
      });
    }
    currentLines = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headingMatch = line.match(/^(#{1,3})\s+(.+)/);

    if (headingMatch) {
      flushChunk();
      currentHeading = headingMatch[2].trim();
      chunkStartLine = i + 1;
      currentLines.push(line);
    } else {
      if (currentLines.length === 0) {
        chunkStartLine = i + 1;
      }
      currentLines.push(line);
    }
  }

  flushChunk();
  return chunks;
}

// --- Feature hashing for local embeddings ---

const VECTOR_DIM = 256;

function hashToken(token: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < token.length; i++) {
    h ^= token.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

export function textToVector(text: string): number[] {
  const vec = new Float64Array(VECTOR_DIM);
  const tokens = tokenize(text);

  // Unigrams
  for (const token of tokens) {
    const h = hashToken(token);
    const idx = h % VECTOR_DIM;
    const sign = (h & 0x80000000) ? -1 : 1;
    vec[idx] += sign;
  }

  // Bigrams for better context
  for (let i = 0; i < tokens.length - 1; i++) {
    const bigram = tokens[i] + '_' + tokens[i + 1];
    const h = hashToken(bigram);
    const idx = h % VECTOR_DIM;
    const sign = (h & 0x80000000) ? -1 : 1;
    vec[idx] += sign * 0.5;
  }

  // L2 normalize
  let norm = 0;
  for (let i = 0; i < VECTOR_DIM; i++) {
    norm += vec[i] * vec[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < VECTOR_DIM; i++) {
      vec[i] /= norm;
    }
  }

  return Array.from(vec);
}

// --- zvec index management ---

const INDEX_DIR_NAME = '.atxp-memory-index';

function getIndexDir(basePath: string): string {
  return path.join(basePath, INDEX_DIR_NAME);
}

const ZVEC_DEPS_DIR = path.join(os.homedir(), '.atxp', 'deps');

async function tryImportZvec() {
  // Dynamic import() of this CJS package puts most exports on .default
  const mod = await import('@zvec/zvec');
  return mod.default ?? mod;
}

async function tryImportZvecFromCache() {
  const { createRequire } = await import('module');
  const require = createRequire(path.join(ZVEC_DEPS_DIR, 'node_modules', '_'));
  const mod = require('@zvec/zvec');
  return mod;
}

async function loadZvec() {
  // Try normal import first (works if installed as a dependency)
  try {
    return await tryImportZvec();
  } catch {
    // not available via normal resolution
  }

  // Try loading from the cached install location
  try {
    return await tryImportZvecFromCache();
  } catch {
    // not installed yet — fall through to auto-install
  }

  // Auto-install on first use into ~/.atxp/deps
  console.log(chalk.gray('Installing @zvec/zvec (one-time setup for local search)...'));
  const { execSync } = await import('child_process');
  try {
    fs.mkdirSync(ZVEC_DEPS_DIR, { recursive: true });
    execSync('npm install --prefix ' + ZVEC_DEPS_DIR + ' @zvec/zvec@^0.2.0', {
      stdio: 'pipe',
      env: { ...process.env, npm_config_loglevel: 'error' },
    });
  } catch {
    console.error(chalk.red('Failed to install @zvec/zvec.'));
    console.error(`Install it manually: ${chalk.cyan('npm install @zvec/zvec')}`);
    process.exit(1);
  }
  try {
    return await tryImportZvecFromCache();
  } catch {
    console.error(chalk.red('Error: @zvec/zvec installed but failed to load.'));
    process.exit(1);
  }
}

async function indexMemory(pathArg: string): Promise<void> {
  if (!pathArg) {
    console.error(chalk.red('Error: --path is required for index'));
    console.error(`Usage: ${chalk.cyan('npx atxp memory index --path <dir>')}`);
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

  const zvec = await loadZvec();

  console.log(chalk.gray(`Collecting files from ${resolvedPath}...`));
  const files = collectFiles(resolvedPath);

  if (files.length === 0) {
    console.log(chalk.yellow('No files found in the specified directory.'));
    return;
  }

  if (files.length >= MAX_FILES) {
    console.log(chalk.yellow(`Warning: reached ${MAX_FILES} file limit. Some files may be excluded.`));
  }

  console.log(chalk.gray(`Found ${files.length} file(s). Chunking and indexing...`));

  // Chunk all files
  const allChunks: TextChunk[] = [];
  for (const file of files) {
    const chunks = chunkMarkdown(file.path, file.content);
    allChunks.push(...chunks);
  }

  if (allChunks.length === 0) {
    console.log(chalk.yellow('No content to index.'));
    return;
  }

  console.log(chalk.gray(`  ${allChunks.length} chunk(s) from ${files.length} file(s)`));

  // Create zvec collection
  const indexDir = getIndexDir(resolvedPath);

  // Remove old index if it exists
  if (fs.existsSync(indexDir)) {
    fs.rmSync(indexDir, { recursive: true, force: true });
  }
  fs.mkdirSync(indexDir, { recursive: true });

  const collectionPath = path.join(indexDir, 'memories');

  const schema = new zvec.ZVecCollectionSchema({
    name: 'memories',
    fields: [
      { name: 'file_path', dataType: zvec.ZVecDataType.STRING },
      { name: 'heading', dataType: zvec.ZVecDataType.STRING },
      { name: 'text', dataType: zvec.ZVecDataType.STRING },
      { name: 'start_line', dataType: zvec.ZVecDataType.INT32 },
    ],
    vectors: [
      {
        name: 'embedding',
        dataType: zvec.ZVecDataType.VECTOR_FP32,
        dimension: VECTOR_DIM,
        indexParams: { indexType: zvec.ZVecIndexType.HNSW },
      },
    ],
  });

  const collection = zvec.ZVecCreateAndOpen(collectionPath, schema);

  try {
    // Insert chunks in batches
    const BATCH_SIZE = 100;
    for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
      const batch = allChunks.slice(i, i + BATCH_SIZE);
      const docs = batch.map((chunk, j) => ({
        id: `chunk_${i + j}`,
        fields: {
          file_path: chunk.filePath,
          heading: chunk.heading,
          text: chunk.text,
          start_line: chunk.startLine,
        },
        vectors: {
          embedding: textToVector(chunk.text),
        },
      }));

      collection.insertSync(docs);
    }

    // Optimize for search performance
    collection.optimizeSync();

    // Write metadata
    const meta = {
      fileCount: files.length,
      chunkCount: allChunks.length,
      indexedAt: new Date().toISOString(),
      vectorDim: VECTOR_DIM,
    };
    fs.writeFileSync(path.join(indexDir, 'meta.json'), JSON.stringify(meta, null, 2));

    console.log();
    console.log(chalk.green.bold('Memory indexed successfully!'));
    console.log('  ' + chalk.bold('Files:') + '    ' + files.length);
    console.log('  ' + chalk.bold('Chunks:') + '   ' + allChunks.length);
    console.log('  ' + chalk.bold('Index:') + '    ' + indexDir);
  } finally {
    collection.closeSync();
  }
}

async function searchMemory(query: string, pathArg: string, topk: number): Promise<void> {
  if (!query) {
    console.error(chalk.red('Error: search query is required'));
    console.error(`Usage: ${chalk.cyan('npx atxp memory search <query> --path <dir>')}`);
    process.exit(1);
  }

  if (!pathArg) {
    console.error(chalk.red('Error: --path is required for search'));
    console.error(`Usage: ${chalk.cyan('npx atxp memory search <query> --path <dir>')}`);
    process.exit(1);
  }

  const resolvedPath = path.resolve(pathArg);
  const indexDir = getIndexDir(resolvedPath);
  const collectionPath = path.join(indexDir, 'memories');

  if (!fs.existsSync(indexDir) || !fs.existsSync(collectionPath)) {
    console.error(chalk.red('No memory index found. Build one first:'));
    console.error(chalk.cyan(`  npx atxp memory index --path ${pathArg}`));
    process.exit(1);
  }

  const zvec = await loadZvec();

  const collection = zvec.ZVecOpen(collectionPath);

  try {
    const queryVec = textToVector(query);

    const results = collection.querySync({
      fieldName: 'embedding',
      vector: queryVec,
      topk,
      outputFields: ['file_path', 'heading', 'text', 'start_line'],
    });

    if (results.length === 0) {
      console.log(chalk.yellow('No matching memories found.'));
      return;
    }

    console.log(chalk.bold(`Found ${results.length} result(s) for "${query}":`));
    console.log();

    for (let i = 0; i < results.length; i++) {
      const doc = results[i];
      const filePath = doc.fields.file_path as string;
      const heading = doc.fields.heading as string;
      const text = doc.fields.text as string;
      const startLine = doc.fields.start_line as number;
      const score = doc.score;

      console.log(chalk.cyan.bold(`  ${i + 1}. ${filePath}:${startLine}`) + chalk.gray(` (score: ${score.toFixed(4)})`));
      if (heading !== filePath) {
        console.log(chalk.bold(`     ${heading}`));
      }
      // Show a preview (first 200 chars)
      const preview = text.length > 200 ? text.slice(0, 200) + '...' : text;
      const indented = preview.split('\n').map((l) => '     ' + l).join('\n');
      console.log(chalk.gray(indented));
      console.log();
    }
  } finally {
    collection.closeSync();
  }
}

// --- Cloud backup operations (preserved from backup.ts) ---

async function pushMemory(pathArg: string): Promise<void> {
  if (!pathArg) {
    console.error(chalk.red('Error: --path is required for push'));
    console.error(`Usage: ${chalk.cyan('npx atxp memory push --path <dir>')}`);
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

  console.log(chalk.gray(`Collecting files from ${resolvedPath}...`));

  const files = collectFiles(resolvedPath);

  if (files.length === 0) {
    console.log(chalk.yellow('No files found in the specified directory.'));
    return;
  }

  if (files.length >= MAX_FILES) {
    console.log(chalk.yellow(`Warning: reached ${MAX_FILES} file limit. Some files may be excluded.`));
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
  console.log(chalk.green.bold('Memory pushed successfully!'));
  console.log('  ' + chalk.bold('Files:') + '     ' + data.fileCount);
  console.log('  ' + chalk.bold('Synced at:') + ' ' + new Date(data.syncedAt).toLocaleString());
}

async function pullMemory(pathArg: string): Promise<void> {
  if (!pathArg) {
    console.error(chalk.red('Error: --path is required for pull'));
    console.error(`Usage: ${chalk.cyan('npx atxp memory pull --path <dir>')}`);
    process.exit(1);
  }

  const resolvedPath = path.resolve(pathArg);
  const { baseUrl, token } = getAccountsAuth();

  console.log(chalk.gray('Pulling memory from server...'));

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
    console.log(chalk.yellow('No memory backup found on server. Push one first with:'));
    console.log(chalk.cyan('  npx atxp memory push --path <dir>'));
    return;
  }

  console.log(chalk.gray(`Extracting zip archive (${formatBytes(zipBuffer.length)})...`));

  const zip = await JSZip.loadAsync(zipBuffer);
  const fileNames = Object.keys(zip.files).filter(name => !zip.files[name].dir);

  if (fileNames.length === 0) {
    console.log(chalk.yellow('No memory backup found on server. Push one first with:'));
    console.log(chalk.cyan('  npx atxp memory push --path <dir>'));
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
  console.log(chalk.green.bold('Memory pulled successfully!'));
  console.log('  ' + chalk.bold('Files written:') + ' ' + fileNames.length);
  console.log('  ' + chalk.bold('Directory:') + '     ' + resolvedPath);
}

async function memoryStatus(): Promise<void> {
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

  console.log(chalk.bold('Memory Status'));
  console.log();

  // Cloud backup status
  console.log(chalk.bold.underline('Cloud Backup'));
  if (data.fileCount === 0) {
    console.log(chalk.gray('  No backup found.'));
    console.log('  Create one with: ' + chalk.cyan('npx atxp memory push --path <dir>'));
  } else {
    console.log('  ' + chalk.bold('Files:') + '       ' + data.fileCount);
    console.log('  ' + chalk.bold('Total size:') + '  ' + formatBytes(data.totalBytes));
    console.log('  ' + chalk.bold('Last sync:') + '   ' + new Date(data.syncedAt).toLocaleString());
  }

  // Check for local index
  console.log();
  console.log(chalk.bold.underline('Local Search Index'));
  // We don't know the path here, so provide guidance
  console.log(chalk.gray('  Use --path to check a specific directory\'s index:'));
  console.log(chalk.cyan('    npx atxp memory status --path <dir>'));
}

async function memoryStatusWithPath(pathArg: string): Promise<void> {
  const resolvedPath = path.resolve(pathArg);
  const indexDir = getIndexDir(resolvedPath);
  const metaPath = path.join(indexDir, 'meta.json');

  console.log(chalk.bold('Memory Status'));
  console.log();

  // Cloud backup status
  try {
    const { baseUrl, token } = getAccountsAuth();
    const res = await fetch(`${baseUrl}/backup/status`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (res.ok) {
      const data = await res.json() as { fileCount: number; syncedAt: string; totalBytes: number };
      console.log(chalk.bold.underline('Cloud Backup'));
      if (data.fileCount === 0) {
        console.log(chalk.gray('  No backup found.'));
      } else {
        console.log('  ' + chalk.bold('Files:') + '       ' + data.fileCount);
        console.log('  ' + chalk.bold('Total size:') + '  ' + formatBytes(data.totalBytes));
        console.log('  ' + chalk.bold('Last sync:') + '   ' + new Date(data.syncedAt).toLocaleString());
      }
      console.log();
    }
  } catch {
    // No auth or network error — skip cloud status silently
  }

  // Local index status
  console.log(chalk.bold.underline('Local Search Index'));
  if (fs.existsSync(metaPath)) {
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      console.log('  ' + chalk.bold('Files:') + '       ' + meta.fileCount);
      console.log('  ' + chalk.bold('Chunks:') + '      ' + meta.chunkCount);
      console.log('  ' + chalk.bold('Indexed at:') + '  ' + new Date(meta.indexedAt).toLocaleString());
      console.log('  ' + chalk.bold('Index path:') + '  ' + indexDir);
    } catch {
      console.log(chalk.yellow('  Index metadata is corrupted. Re-index with:'));
      console.log(chalk.cyan(`    npx atxp memory index --path ${pathArg}`));
    }
  } else {
    console.log(chalk.gray('  No local index found.'));
    console.log('  Create one with: ' + chalk.cyan(`npx atxp memory index --path ${pathArg}`));
  }
}

// --- Helpers ---

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function showMemoryHelp(): void {
  console.log(chalk.bold('Memory Commands:'));
  console.log();
  console.log(chalk.bold.underline('Cloud Backup'));
  console.log('  ' + chalk.cyan('npx atxp memory push --path <dir>') + '     ' + 'Push files to server');
  console.log('  ' + chalk.cyan('npx atxp memory pull --path <dir>') + '     ' + 'Pull files from server');
  console.log('  ' + chalk.cyan('npx atxp memory status') + '                ' + 'Show backup & index info');
  console.log();
  console.log(chalk.bold.underline('Local Search'));
  console.log('  ' + chalk.cyan('npx atxp memory index --path <dir>') + '    ' + 'Index files for search');
  console.log('  ' + chalk.cyan('npx atxp memory search <query> --path <dir>') + '  Search memories');
  console.log();
  console.log(chalk.bold('Details:'));
  console.log('  push/pull back up text files (recursively) to/from ATXP servers.');
  console.log('  Respects .gitignore rules; skips node_modules, .git, and binary files.');
  console.log('  Files are compressed into a zip archive before upload.');
  console.log('  Each push replaces the previous server snapshot entirely.');
  console.log('  Pull writes server files to the local directory (non-destructive).');
  console.log(`  Maximum ${MAX_FILES} files per push/index.`);
  console.log();
  console.log('  index scans text files, chunks them by heading, and builds a local');
  console.log('  vector search index using zvec. search finds relevant memory chunks');
  console.log('  by similarity. No network access needed for index/search.');
  console.log();
  console.log(chalk.bold('Options:'));
  console.log('  ' + chalk.yellow('--path') + '   ' + 'Directory to operate on (required for push/pull/index/search)');
  console.log('  ' + chalk.yellow('--topk') + '   ' + 'Number of results to return (default: 10, search only)');
  console.log();
  console.log(chalk.bold('Examples:'));
  console.log('  npx atxp memory push --path ~/.openclaw/workspace-abc/');
  console.log('  npx atxp memory pull --path ~/.openclaw/workspace-abc/');
  console.log('  npx atxp memory index --path ~/.openclaw/workspace-abc/');
  console.log('  npx atxp memory search "authentication flow" --path ~/.openclaw/workspace-abc/');
  console.log('  npx atxp memory status --path ~/.openclaw/workspace-abc/');
}

// --- Main command router ---

export async function memoryCommand(subCommand: string, options: MemoryOptions, query?: string): Promise<void> {
  if (!subCommand || subCommand === 'help' || subCommand === '--help' || subCommand === '-h') {
    showMemoryHelp();
    return;
  }

  switch (subCommand) {
    case 'push':
      await pushMemory(options.path || '');
      break;

    case 'pull':
      await pullMemory(options.path || '');
      break;

    case 'status':
      if (options.path) {
        await memoryStatusWithPath(options.path);
      } else {
        await memoryStatus();
      }
      break;

    case 'index':
      await indexMemory(options.path || '');
      break;

    case 'search':
      await searchMemory(query || '', options.path || '', options.topk || 10);
      break;

    default:
      console.error(chalk.red(`Unknown memory command: ${subCommand}`));
      console.log();
      showMemoryHelp();
      process.exit(1);
  }
}
