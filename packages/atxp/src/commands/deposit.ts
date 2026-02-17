import chalk from 'chalk';
import { getConnection } from '../config.js';

const ACCOUNT_URL = 'https://accounts.atxp.ai/me';

/**
 * Extract the connection_token from the ATXP_CONNECTION string.
 * Connection string format: https://accounts.atxp.ai?connection_token=<token>
 */
function getConnectionToken(connectionString: string): string | null {
  try {
    const url = new URL(connectionString);
    return url.searchParams.get('connection_token');
  } catch {
    return null;
  }
}

export async function depositCommand(): Promise<void> {
  const connection = getConnection();

  if (!connection) {
    console.error(chalk.red('Not logged in.'));
    console.error(`Run: ${chalk.cyan('npx atxp login')}`);
    process.exit(1);
  }

  const token = getConnectionToken(connection);
  if (!token) {
    console.error(chalk.red('Error: Could not extract connection token.'));
    console.error('Your ATXP_CONNECTION may be malformed. Try logging in again:');
    console.error(chalk.cyan('  npx atxp login --force'));
    process.exit(1);
  }

  try {
    const credentials = Buffer.from(`${token}:`).toString('base64');
    const response = await fetch(ACCOUNT_URL, {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(chalk.red(`Error: ${response.status} ${response.statusText}`));
      process.exit(1);
    }

    const data = await response.json();

    if (data.sources && Array.isArray(data.sources) && data.sources.length > 0) {
      console.log(chalk.bold('Fund via USDC:'));
      for (const source of data.sources) {
        const chain = source.chain.charAt(0).toUpperCase() + source.chain.slice(1);
        console.log(`  ${chalk.cyan(chain)}: ${source.address}`);
      }
      console.log();
      console.log(chalk.bold('Fund via credit card or other payment methods:'));
      console.log(`  ${chalk.underline('https://accounts.atxp.ai/fund')}`);
    } else {
      console.log(chalk.yellow('No deposit addresses found for this account.'));
      console.log();
      console.log(chalk.bold('Fund via credit card or other payment methods:'));
      console.log(`  ${chalk.underline('https://accounts.atxp.ai/fund')}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Error fetching funding info: ${errorMessage}`));
    process.exit(1);
  }
}
