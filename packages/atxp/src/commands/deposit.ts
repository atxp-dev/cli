import chalk from 'chalk';
import open from 'open';
import { getConnection } from '../config.js';

const DEFAULT_AMOUNT = 10;
const MIN_AMOUNT = 1;
const MAX_AMOUNT = 1000;

function getAccountsAuth(): { baseUrl: string; token: string } {
  const connection = getConnection();
  if (!connection) {
    console.error(chalk.red('Not logged in.'));
    console.error(`Run: ${chalk.cyan('npx atxp login')}`);
    process.exit(1);
  }
  const url = new URL(connection);
  const token = url.searchParams.get('connection_token');
  if (!token) {
    console.error(chalk.red('Invalid connection string: missing connection_token'));
    process.exit(1);
  }
  return { baseUrl: `${url.protocol}//${url.host}`, token };
}

function getArgValue(flag: string): string | undefined {
  const index = process.argv.findIndex((arg) => arg === flag);
  return index !== -1 ? process.argv[index + 1] : undefined;
}

function showFundHelp(): void {
  console.log(chalk.bold('Fund Commands:'));
  console.log();
  console.log('  ' + chalk.cyan('npx atxp fund') + '               ' + 'Show funding options for your account');
  console.log('  ' + chalk.cyan('npx atxp fund --amount 100') + '  ' + 'Request a $100 payment link (agents only)');
  console.log();
  console.log(chalk.bold('Options:'));
  console.log('  ' + chalk.yellow('--amount') + '  ' + `Suggested amount in USD ($${MIN_AMOUNT}-$${MAX_AMOUNT}, default: $${DEFAULT_AMOUNT})`);
  console.log('  ' + chalk.yellow('--open') + '    ' + 'Open the payment link in your browser');
  console.log();
  console.log(chalk.bold('How it works:'));
  console.log('  Shows all available ways to fund your account:');
  console.log('  - Crypto deposit addresses (USDC on supported chains)');
  console.log('  - Payment link (agent accounts only) - shareable Stripe link');
  console.log('  The payer can adjust the amount at checkout.');
}

export async function depositCommand(): Promise<void> {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showFundHelp();
    return;
  }

  const { baseUrl, token } = getAccountsAuth();

  // Parse amount for payment link
  const amountStr = getArgValue('--amount');
  let amount = DEFAULT_AMOUNT;
  if (amountStr) {
    amount = parseFloat(amountStr);
    if (isNaN(amount) || amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
      console.error(chalk.red(`Invalid amount: must be between $${MIN_AMOUNT} and $${MAX_AMOUNT}`));
      process.exit(1);
    }
  }

  const shouldOpen = process.argv.includes('--open');

  console.log(chalk.gray('Fetching funding options...'));

  try {
    const res = await fetch(`${baseUrl}/api/funding/fund`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as Record<string, string>;
      console.error(chalk.red(`Error: ${body.error || res.statusText}`));
      process.exit(1);
    }

    const data = await res.json() as {
      paymentLink: {
        url: string;
        paymentLinkId: string;
        suggestedAmount: number;
        minAmount: number;
        maxAmount: number;
      } | null;
      cryptoDeposit: Array<{
        address: string;
        network: string;
        currency: string;
      }>;
    };

    console.log();

    // Display crypto deposit addresses
    if (data.cryptoDeposit && data.cryptoDeposit.length > 0) {
      console.log(chalk.bold('Fund via USDC:'));
      for (const source of data.cryptoDeposit) {
        const chain = source.network.charAt(0).toUpperCase() + source.network.slice(1);
        console.log(`  ${chalk.cyan(chain)}: ${source.address}`);
      }
      console.log();
    }

    // Display payment link (agent accounts only)
    if (data.paymentLink) {
      console.log(chalk.bold('Fund via payment link:'));
      console.log('  ' + chalk.bold('Suggested:') + '  ' + chalk.green(`$${data.paymentLink.suggestedAmount.toFixed(2)}`));
      console.log('  ' + chalk.bold('Range:') + '      ' + chalk.gray(`$${data.paymentLink.minAmount} - $${data.paymentLink.maxAmount}`));
      console.log('  ' + chalk.bold('URL:') + '        ' + chalk.cyan.underline(data.paymentLink.url));
      console.log();
      console.log(chalk.gray('Share this link with anyone to fund your account.'));
      console.log(chalk.gray('The payer can adjust the amount at checkout.'));

      if (shouldOpen) {
        console.log();
        console.log(chalk.gray('Opening in browser...'));
        await open(data.paymentLink.url);
      }
    }

    // If neither is available
    if ((!data.cryptoDeposit || data.cryptoDeposit.length === 0) && !data.paymentLink) {
      console.log(chalk.yellow('No funding options found for this account.'));
      console.log();
      console.log(chalk.bold('Fund via credit card or other payment methods:'));
      console.log(`  ${chalk.underline('https://accounts.atxp.ai/fund')}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Error fetching funding options: ${errorMessage}`));
    process.exit(1);
  }
}
