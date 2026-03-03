import fs from 'fs';
import path from 'path';
import os from 'os';

export const CONFIG_DIR = path.join(os.homedir(), '.atxp');
export const CONFIG_FILE = path.join(CONFIG_DIR, 'config');

/**
 * Get the ATXP connection string.
 * Checks env var first, falls back to reading from config file.
 */
export function getConnection(): string | null {
  // Check env var first
  if (process.env.ATXP_CONNECTION) {
    return process.env.ATXP_CONNECTION;
  }

  // Fall back to reading from config file
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
      // Parse both old format (export ATXP_CONNECTION="value") and new format (ATXP_CONNECTION=value)
      const match = content.match(/^(?:export\s+)?ATXP_CONNECTION=["']?(.+?)["']?\s*$/m);
      if (match) {
        return match[1];
      }
    } catch {
      // Ignore read errors
    }
  }

  return null;
}

/**
 * Save the connection string to the config file.
 */
export function saveConnection(connectionString: string): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }

  const configContent = `ATXP_CONNECTION=${connectionString}\n`;
  fs.writeFileSync(CONFIG_FILE, configContent, { mode: 0o600 });
}
