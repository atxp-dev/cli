import chalk from 'chalk';
import { getConnection } from '../config.js';
import { callTool } from '../call-tool.js';

const DEFAULT_ACCOUNTS_URL = 'https://accounts.atxp.ai';

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

export interface AccountInfo {
  accountId: string;
  accountType?: string;
  email?: string;
  displayName?: string;
  sources?: Array<{ chain: string; address: string }>;
  team?: { id: string; name: string; role: string };
  ownerEmail?: string;
  isOrphan?: boolean;
}

/**
 * Fetch account info from the accounts API.
 * Returns the account data on success, or null on failure.
 * Callers needing HTTP status details can use fetchAccountInfo() instead.
 */
export async function getAccountInfo(): Promise<AccountInfo | null> {
  const result = await fetchAccountInfo();
  return result.data ?? null;
}

/**
 * Fetch account info with full error context.
 * Returns { data } on success, { status } on HTTP error, or {} on network/parse failure.
 */
export async function fetchAccountInfo(): Promise<{ data?: AccountInfo; status?: number }> {
  const connection = getConnection();
  if (!connection) return {};
  const token = getConnectionToken(connection);
  if (!token) return {};
  const baseUrl = getBaseUrl(connection);
  try {
    const credentials = Buffer.from(`${token}:`).toString('base64');
    const response = await fetch(`${baseUrl}/me`, {
      headers: { 'Authorization': `Basic ${credentials}` },
    });
    if (!response.ok) return { status: response.status };
    return { data: await response.json() as AccountInfo };
  } catch {
    return {};
  }
}

export async function whoamiCommand(): Promise<void> {
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
    // Fetch account info and phone number in parallel
    const [accountResult, phoneNumber] = await Promise.all([
      fetchAccountInfo(),
      callTool('phone.mcp.atxp.ai', 'phone_check_sms', {})
        .then((r) => { try { return JSON.parse(r).phoneNumber || null; } catch { return null; } })
        .catch(() => null),
    ]);

    const data = accountResult.data;
    if (!data) {
      if (accountResult.status === 401) {
        console.error(chalk.red('Error: Invalid or expired connection token.'));
      } else {
        console.error(chalk.red('Error: Could not fetch account info.'));
      }
      console.error(`Try logging in again: ${chalk.cyan('npx atxp login --force')}`);
      process.exit(1);
    }

    // Find the primary wallet address from sources
    const wallet = data.sources?.[0];

    console.log();
    console.log('  ' + chalk.bold('Account ID:') + '        ' + data.accountId);
    console.log('  ' + chalk.bold('Account Type:') + '      ' + (data.accountType || 'human'));
    if (data.email) {
      console.log('  ' + chalk.bold('Email:') + '             ' + chalk.cyan(data.email));
    }
    if (phoneNumber) {
      console.log('  ' + chalk.bold('Phone:') + '             ' + chalk.cyan(phoneNumber));
    }
    if (data.displayName) {
      console.log('  ' + chalk.bold('Display Name:') + '      ' + data.displayName);
    }
    console.log('  ' + chalk.bold('Connection Token:') + '  ' + token);
    if (wallet) {
      console.log('  ' + chalk.bold('Wallet:') + '            ' + wallet.address + chalk.gray(` (${wallet.chain})`));
    }
    if (data.ownerEmail) {
      console.log('  ' + chalk.bold('Owner:') + '             ' + chalk.cyan(data.ownerEmail));
    }
    if (data.isOrphan) {
      console.log('  ' + chalk.bold('Owner:') + '             ' + chalk.gray('self-registered (no owner)'));
    }
    if (data.team) {
      console.log('  ' + chalk.bold('Team:') + '              ' + data.team.name + chalk.gray(` (${data.team.role})`));
    }
    console.log();
    console.log(chalk.bold('Connection String:'));
    console.log('  ' + chalk.cyan(connection));
    console.log();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Error fetching account info: ${errorMessage}`));
    process.exit(1);
  }
}
