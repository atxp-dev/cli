import http from 'http';
import fs from 'fs';
import chalk from 'chalk';
import open from 'open';
import qrcode from 'qrcode-terminal';
import { saveConnection, updateShellProfile, CONFIG_FILE, getShellProfile } from './config.js';
import { getContext } from './vendor/context.js';

interface LoginOptions {
  force?: boolean;
  token?: string;
  qr?: boolean;
}

export async function login(options: LoginOptions = {}): Promise<void> {
  // Check if already logged in
  const existingConnection = process.env.ATXP_CONNECTION;

  if (existingConnection && !options.force && !options.token) {
    console.log(chalk.yellow('Already logged in (ATXP_CONNECTION is set).'));
    console.log('Run with --force to update your connection string.');
    return;
  }

  console.log(chalk.bold('ATXP Login'));
  console.log();

  try {
    // Collect runtime context for rate limiting
    const ctx = await getContext().catch(() => '');

    let connectionString: string;

    // If token provided directly, use it (headless mode)
    if (options.token) {
      // If the token is already a full connection string URL, use it directly
      if (options.token.startsWith('http')) {
        connectionString = options.token;
      } else {
        connectionString = `https://accounts.atxp.ai?connection_token=${options.token}`;
      }
      console.log('Using provided token for headless authentication...');
    } else if (options.qr) {
      // QR code mode explicitly requested
      connectionString = await loginWithQRCode(ctx);
    } else {
      // Try browser first, fall back to QR code on failure
      connectionString = await loginWithBrowserOrQR(ctx);
    }

    saveConnection(connectionString);

    // Report context for headless token mode (browser/QR modes include it in the URL)
    if (options.token && ctx) {
      try {
        const url = new URL(connectionString);
        const token = url.searchParams.get('connection_token');
        const baseUrl = `${url.protocol}//${url.host}`;
        if (token) {
          await fetch(`${baseUrl}/ctx`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ ctx }),
          }).catch(() => {});
        }
      } catch {
        // Ignore - non-critical
      }
    }

    // Try to auto-update shell profile
    const profileUpdated = updateShellProfile();
    const profilePath = getShellProfile();

    console.log();
    console.log(chalk.green('Login successful!'));

    if (profileUpdated && profilePath) {
      console.log();
      console.log(`Added ATXP to ${chalk.cyan(profilePath)}`);
      console.log('New terminal windows will automatically have access to ATXP tools.');
      console.log();
      console.log('To use ATXP in this terminal session, run:');
      console.log(chalk.cyan(`  source ${CONFIG_FILE}`));
    } else if (profilePath) {
      // Profile exists but wasn't updated (already has source line)
      console.log();
      console.log("You're all set! New terminal windows will have access to ATXP tools.");
      console.log();
      console.log('To use ATXP in this terminal session, run:');
      console.log(chalk.cyan(`  source ${CONFIG_FILE}`));
    } else {
      // Couldn't detect shell profile - provide manual instructions
      console.log();
      console.log('To use ATXP tools in this terminal, run:');
      console.log(chalk.cyan(`  source ${CONFIG_FILE}`));
      console.log();
      console.log('To persist this, add the above line to your shell profile.');
    }
  } catch (error) {
    console.error(chalk.red('Login failed:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

/**
 * Check if we're likely in a headless environment where browser won't work
 */
function isHeadlessEnvironment(): boolean {
  // Common indicators of headless/non-GUI environments
  const isSSH = !!process.env.SSH_TTY || !!process.env.SSH_CONNECTION;
  const noDisplay = process.platform !== 'win32' && process.platform !== 'darwin' && !process.env.DISPLAY;
  const isDocker = fs.existsSync('/.dockerenv');
  const isCI = !!process.env.CI || !!process.env.GITHUB_ACTIONS || !!process.env.GITLAB_CI;

  return isSSH || noDisplay || isDocker || isCI;
}

/**
 * Try browser login first, fall back to QR code if it fails
 */
async function loginWithBrowserOrQR(ctx: string): Promise<string> {
  // If we detect a headless environment, go straight to QR
  if (isHeadlessEnvironment()) {
    console.log(chalk.yellow('Headless environment detected, using QR code login...'));
    console.log();
    return loginWithQRCode(ctx);
  }

  // Try browser-based login
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url!, `http://localhost`);
      const connectionString = url.searchParams.get('connection_string');

      if (connectionString) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(getSuccessHTML());
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
    server.listen(0, '127.0.0.1', async () => {
      const address = server.address();
      const port = typeof address === 'object' ? address?.port : null;

      if (!port) {
        reject(new Error('Failed to start local server'));
        return;
      }

      const redirectUri = `http://localhost:${port}/callback`;
      let loginUrl = `https://accounts.atxp.ai?cli_redirect=${encodeURIComponent(redirectUri)}`;
      if (ctx) loginUrl += `&ctx=${encodeURIComponent(ctx)}`;

      console.log('Opening browser to complete login...');
      console.log(chalk.gray(`(${loginUrl})`));
      console.log();

      try {
        // Try to open browser
        const browserProcess = await open(loginUrl);

        // Check if the browser process exited with an error
        browserProcess.on('error', async () => {
          console.log();
          console.log(chalk.yellow('Browser failed to open. Switching to QR code...'));
          console.log();
          server.close();
          try {
            const result = await loginWithQRCode(ctx);
            resolve(result);
          } catch (qrError) {
            reject(qrError);
          }
        });

        console.log('Waiting for authentication...');
        console.log(chalk.gray('(If browser did not open, press Ctrl+C and run: npx atxp login --qr)'));

      } catch (openError) {
        // Browser open failed, fall back to QR
        console.log();
        console.log(chalk.yellow('Could not open browser. Switching to QR code...'));
        console.log();
        server.close();
        try {
          const result = await loginWithQRCode(ctx);
          resolve(result);
        } catch (qrError) {
          reject(qrError);
        }
        return;
      }

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

/**
 * QR code based login - shows QR in terminal for mobile scanning
 */
async function loginWithQRCode(ctx: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url!, `http://localhost`);
      const connectionString = url.searchParams.get('connection_string');

      if (connectionString) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(getSuccessHTML());
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
      let loginUrl = `https://accounts.atxp.ai?cli_redirect=${encodeURIComponent(redirectUri)}`;
      if (ctx) loginUrl += `&ctx=${encodeURIComponent(ctx)}`;

      console.log(chalk.bold('Scan this QR code with your phone to login:'));
      console.log();

      // Generate and display QR code
      qrcode.generate(loginUrl, { small: true }, (qr) => {
        console.log(qr);
      });

      console.log();
      console.log(chalk.gray('Or open this URL manually:'));
      console.log(chalk.cyan(loginUrl));
      console.log();
      console.log('Waiting for authentication...');

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

function getSuccessHTML(): string {
  return `
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
  `;
}

