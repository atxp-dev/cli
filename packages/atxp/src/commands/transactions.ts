import chalk from 'chalk';
import { getConnection } from '../config.js';

const DEFAULT_ACCOUNTS_URL = 'https://accounts.atxp.ai';

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

function getBaseUrl(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    return `${url.protocol}//${url.host}`;
  } catch {
    return DEFAULT_ACCOUNTS_URL;
  }
}

export async function transactionsCommand(): Promise<void> {
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

  // Parse --limit flag (default 10)
  const limitIndex = process.argv.findIndex((arg) => arg === '--limit' || arg === '-l');
  const limitValue = limitIndex !== -1 ? process.argv[limitIndex + 1] : undefined;
  const limit = limitValue ? parseInt(limitValue, 10) : 10;

  const baseUrl = getBaseUrl(connection);

  try {
    const credentials = Buffer.from(`${token}:`).toString('base64');
    const response = await fetch(`${baseUrl}/api/transactions?limit=${limit}`, {
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

    const transactions = Array.isArray(data.transactions)
      ? data.transactions
      : Array.isArray(data)
        ? data
        : [];

    if (transactions.length === 0) {
      console.log(chalk.gray('No transactions found.'));
      return;
    }

    console.log(chalk.bold(`Recent transactions (${transactions.length}):\n`));
    for (const tx of transactions) {
      const amount = tx.amount != null ? `$${(+tx.amount).toFixed(2)}` : '';
      const type = tx.type || '';
      const description = tx.description || '';
      const date = tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : '';
      console.log(
        `  ${chalk.gray(date)}  ${chalk.yellow(type.padEnd(12))}  ${chalk.green(amount.padStart(8))}  ${description}`
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Error fetching transactions: ${errorMessage}`));
    process.exit(1);
  }
}
