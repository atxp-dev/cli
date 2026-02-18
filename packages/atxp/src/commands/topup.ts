import chalk from 'chalk';
import open from 'open';
import { getConnection } from '../config.js';

const DEFAULT_ACCOUNTS_URL = 'https://accounts.atxp.ai';
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

function showTopupHelp(): void {
  console.log(chalk.bold('Top Up Commands:'));
  console.log();
  console.log('  ' + chalk.cyan('npx atxp topup') + '               ' + 'Create a payment link ($50 suggested)');
  console.log('  ' + chalk.cyan('npx atxp topup --amount 100') + '  ' + 'Create a payment link suggesting $100');
  console.log();
  console.log(chalk.bold('Options:'));
  console.log('  ' + chalk.yellow('--amount') + '  ' + `Suggested amount in USD ($${MIN_AMOUNT}-$${MAX_AMOUNT}, default: $${DEFAULT_AMOUNT})`);
  console.log('  ' + chalk.yellow('--open') + '    ' + 'Open the payment link in your browser');
  console.log();
  console.log(chalk.bold('How it works:'));
  console.log('  Creates a Stripe Payment Link for your agent account.');
  console.log('  The payer can adjust the amount at checkout.');
  console.log('  Share the link with anyone to fund your account.');
  console.log('  Funds are credited as IOU tokens once payment completes.');
}

export async function topupCommand(): Promise<void> {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showTopupHelp();
    return;
  }

  const { baseUrl, token } = getAccountsAuth();

  // Parse amount
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

  console.log(chalk.gray(`Creating $${amount.toFixed(2)} payment link...`));

  try {
    const res = await fetch(`${baseUrl}/api/funding/payment-link`, {
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
      if (res.status === 403) {
        console.error(chalk.gray('Payment links are only available for agent accounts.'));
      }
      process.exit(1);
    }

    const data = await res.json() as {
      url: string;
      paymentLinkId: string;
      suggestedAmount: number;
      minAmount: number;
      maxAmount: number;
    };

    console.log();
    console.log(chalk.green.bold('Payment link created!'));
    console.log();
    console.log('  ' + chalk.bold('Suggested:') + '  ' + chalk.green(`$${data.suggestedAmount.toFixed(2)}`));
    console.log('  ' + chalk.bold('Range:') + '      ' + chalk.gray(`$${data.minAmount} - $${data.maxAmount}`));
    console.log('  ' + chalk.bold('URL:') + '        ' + chalk.cyan.underline(data.url));
    console.log();
    console.log(chalk.gray('Share this link to fund your agent account.'));
    console.log(chalk.gray('The payer can adjust the amount at checkout.'));

    if (shouldOpen) {
      console.log();
      console.log(chalk.gray('Opening in browser...'));
      await open(data.url);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Error creating payment link: ${errorMessage}`));
    process.exit(1);
  }
}
