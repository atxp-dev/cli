import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import open from 'open';

interface LoginOptions {
  force?: boolean;
}

const CONFIG_DIR = path.join(os.homedir(), '.atxp');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config');

export async function login(options: LoginOptions = {}): Promise<void> {
  // Check if already logged in
  const existingConnection = process.env.ATXP_CONNECTION;

  if (existingConnection && !options.force) {
    console.log(chalk.yellow('Already logged in (ATXP_CONNECTION is set).'));
    console.log('Run with --force to update your connection string.');
    return;
  }

  console.log(chalk.bold('ATXP Login'));
  console.log();

  try {
    const connectionString = await loginWithBrowser();
    saveConnectionString(connectionString);

    console.log();
    console.log(chalk.green('Login successful!'));
    console.log();
    console.log('To use ATXP tools in this terminal, run:');
    console.log(chalk.cyan(`  source ${CONFIG_FILE}`));
    console.log();
    console.log('Or add this to your shell profile (~/.bashrc, ~/.zshrc, etc.):');
    console.log(chalk.cyan(`  source ${CONFIG_FILE}`));
  } catch (error) {
    console.error(chalk.red('Login failed:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

async function loginWithBrowser(): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url!, `http://localhost`);
      const connectionString = url.searchParams.get('connection_string');

      if (connectionString) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
<!DOCTYPE html>
<html>
<head>
  <title>ATXP Login</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: #f5f5f5;
    }
    .container {
      text-align: center;
      padding: 40px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 { color: #10b981; margin-bottom: 16px; }
    p { color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Login Successful</h1>
    <p>You can close this tab and return to your terminal.</p>
  </div>
</body>
</html>
        `);
        server.close();
        resolve(decodeURIComponent(connectionString));
      } else {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Missing connection_string parameter');
      }
    });

    server.on('error', (err) => {
      reject(new Error(`Failed to start local server: ${err.message}`));
    });

    // Listen on random available port
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' ? address?.port : null;

      if (!port) {
        reject(new Error('Failed to start local server'));
        return;
      }

      const redirectUri = `http://localhost:${port}/callback`;
      const loginUrl = `https://accounts.atxp.ai?cli_redirect=${encodeURIComponent(redirectUri)}`;

      console.log('Opening browser to complete login...');
      console.log(chalk.gray(`(${loginUrl})`));
      console.log();
      console.log('Waiting for authentication...');

      open(loginUrl);

      // Timeout after 5 minutes
      const timeout = setTimeout(() => {
        server.close();
        reject(new Error('Login timed out. Please try again.'));
      }, 5 * 60 * 1000);

      server.on('close', () => {
        clearTimeout(timeout);
      });
    });
  });
}

function saveConnectionString(connectionString: string): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }

  const configContent = `export ATXP_CONNECTION="${connectionString}"
`;
  fs.writeFileSync(CONFIG_FILE, configContent, { mode: 0o600 });
}
