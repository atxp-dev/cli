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
      // Parse: export ATXP_CONNECTION="..."
      const match = content.match(/export ATXP_CONNECTION="(.+)"/);
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

  const configContent = `export ATXP_CONNECTION="${connectionString}"
`;
  fs.writeFileSync(CONFIG_FILE, configContent, { mode: 0o600 });
}

/**
 * Detect the user's shell profile path.
 * Returns null if shell cannot be detected or is unsupported.
 */
export function getShellProfile(): string | null {
  const shell = process.env.SHELL || '';
  const home = os.homedir();

  if (shell.includes('zsh')) {
    return path.join(home, '.zshrc');
  }

  if (shell.includes('bash')) {
    // On macOS, use .bash_profile; on Linux, use .bashrc
    if (process.platform === 'darwin') {
      return path.join(home, '.bash_profile');
    }
    return path.join(home, '.bashrc');
  }

  // Fish uses different syntax, skip it
  // Other shells are unsupported
  return null;
}

/**
 * Add "source ~/.atxp/config" to the user's shell profile if not already present.
 * Returns true if the profile was updated, false otherwise.
 */
export function updateShellProfile(): boolean {
  const profilePath = getShellProfile();
  if (!profilePath) {
    return false;
  }

  const sourceLine = `source ${CONFIG_FILE}`;

  try {
    let profileContent = '';

    if (fs.existsSync(profilePath)) {
      profileContent = fs.readFileSync(profilePath, 'utf-8');
      // Check if already present
      if (profileContent.includes(sourceLine)) {
        return false;
      }
    }

    // Add the source line with a comment
    const addition = `
# ATXP CLI configuration
if [ -f "${CONFIG_FILE}" ]; then
  ${sourceLine}
fi
`;

    fs.appendFileSync(profilePath, addition);
    return true;
  } catch {
    // Silently fail - CLI will still work via config file read
    return false;
  }
}
