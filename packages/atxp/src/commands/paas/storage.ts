import { callTool } from '../../call-tool.js';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

const SERVER = 'paas.mcp.atxp.ai';

interface StorageUploadOptions {
  file?: string;
  content?: string;
}

interface StorageDownloadOptions {
  output?: string;
}

interface StorageFilesOptions {
  prefix?: string;
  limit?: number;
}

export async function storageCreateCommand(name: string): Promise<void> {
  const result = await callTool(SERVER, 'create_bucket', { name });
  console.log(result);
}

export async function storageListCommand(): Promise<void> {
  const result = await callTool(SERVER, 'list_buckets', {});
  console.log(result);
}

export async function storageUploadCommand(
  bucket: string,
  key: string,
  options: StorageUploadOptions
): Promise<void> {
  let content: string;
  let isBase64 = false;
  let contentType: string | undefined;

  if (options.file) {
    const filePath = path.resolve(options.file);
    if (!fs.existsSync(filePath)) {
      console.error(chalk.red(`Error: File not found: ${filePath}`));
      process.exit(1);
    }

    // Read file and determine if it's binary
    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();

    // Common binary extensions
    const binaryExtensions = [
      '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.bmp',
      '.pdf', '.zip', '.tar', '.gz', '.rar',
      '.mp3', '.mp4', '.wav', '.avi', '.mov',
      '.woff', '.woff2', '.ttf', '.otf',
      '.exe', '.dll', '.so', '.dylib',
    ];

    if (binaryExtensions.includes(ext)) {
      content = buffer.toString('base64');
      isBase64 = true;
    } else {
      content = buffer.toString('utf-8');
    }

    // Set content type based on extension
    const mimeTypes: Record<string, string> = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.txt': 'text/plain',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.zip': 'application/zip',
      '.mp3': 'audio/mpeg',
      '.mp4': 'video/mp4',
    };
    contentType = mimeTypes[ext];
  } else if (options.content) {
    content = options.content;
  } else {
    console.error(chalk.red('Error: Either --file or --content is required'));
    console.log(`Usage: ${chalk.cyan('npx atxp paas storage upload <bucket> <key> --file <path>')}`);
    process.exit(1);
  }

  const args: Record<string, unknown> = {
    bucket,
    key,
    content,
    is_base64: isBase64,
  };

  if (contentType) {
    args.content_type = contentType;
  }

  const result = await callTool(SERVER, 'upload_file', args);
  console.log(result);
}

export async function storageDownloadCommand(
  bucket: string,
  key: string,
  options: StorageDownloadOptions
): Promise<void> {
  const result = await callTool(SERVER, 'get_file', { bucket, key });

  // If output file specified, try to save the content
  if (options.output) {
    try {
      const parsed = JSON.parse(result);
      if (parsed.success && parsed.file) {
        const outputPath = path.resolve(options.output);
        let data: Buffer | string;

        if (parsed.file.is_base64) {
          data = Buffer.from(parsed.file.content, 'base64');
        } else {
          data = parsed.file.content;
        }

        fs.writeFileSync(outputPath, data);
        console.log(chalk.green(`File saved to: ${outputPath}`));
        return;
      }
    } catch {
      // Fall through to print raw result
    }
  }

  console.log(result);
}

export async function storageFilesCommand(
  bucket: string,
  options: StorageFilesOptions
): Promise<void> {
  const args: Record<string, unknown> = { bucket };

  if (options.prefix) {
    args.prefix = options.prefix;
  }
  if (options.limit !== undefined) {
    args.limit = options.limit;
  }

  const result = await callTool(SERVER, 'list_files', args);
  console.log(result);
}

export async function storageDeleteBucketCommand(name: string): Promise<void> {
  const result = await callTool(SERVER, 'delete_bucket', { name });
  console.log(result);
}

export async function storageDeleteFileCommand(
  bucket: string,
  key: string
): Promise<void> {
  const result = await callTool(SERVER, 'delete_file', { bucket, key });
  console.log(result);
}
