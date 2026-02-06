import chalk from 'chalk';
import { getConnection } from '../config.js';

const BALANCE_URL = 'https://accounts.atxp.ai/balance';

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

export async function balanceCommand(): Promise<void> {
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
    const response = await fetch(BALANCE_URL, {
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

    if (data.balance) {
      const usdc = +(data.balance.usdc || 0);
      const iou = +(data.balance.iou || 0);
      const total = +(usdc + iou).toFixed(2);
      console.log(chalk.bold('ATXP Balance: ') + chalk.green(`$${total.toFixed(2)}`));
      if (usdc > 0 && iou > 0) {
        console.log(chalk.gray(`  USDC: $${usdc.toFixed(2)}  IOU: $${iou.toFixed(2)}`));
      }
    } else {
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Error fetching balance: ${errorMessage}`));
    process.exit(1);
  }
}
