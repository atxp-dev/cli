import fs from 'fs';
import path from 'path';
import os from 'os';
import inquirer from 'inquirer';
import chalk from 'chalk';

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
  console.log(`Get your connection string from: ${chalk.cyan('https://accounts.atxp.ai')}`);
  console.log();

  const { connectionString } = await inquirer.prompt([
    {
      type: 'password',
      name: 'connectionString',
      message: 'Enter your connection string:',
      mask: '*',
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return 'Connection string is required';
        }
        return true;
      },
    },
  ]);

  // Create config directory if it doesn't exist
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }

  // Write config file as shell export
  const configContent = `export ATXP_CONNECTION="${connectionString.trim()}"
`;

  fs.writeFileSync(CONFIG_FILE, configContent, { mode: 0o600 });

  console.log();
  console.log(chalk.green('Login successful!'));
  console.log();
  console.log('To use ATXP tools in this terminal, run:');
  console.log(chalk.cyan(`  source ${CONFIG_FILE}`));
  console.log();
  console.log('Or add this to your shell profile (~/.bashrc, ~/.zshrc, etc.):');
  console.log(chalk.cyan(`  source ${CONFIG_FILE}`));
}
