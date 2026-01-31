import { callTool } from '../call-tool.js';
import chalk from 'chalk';

const SERVER = 'email.mcp.atxp.ai';

interface EmailOptions {
  to?: string;
  subject?: string;
  body?: string;
}

function showEmailHelp(): void {
  console.log(chalk.bold('Email Commands:'));
  console.log();
  console.log('  ' + chalk.cyan('npx atxp email inbox') + '              ' + 'Check your inbox');
  console.log('  ' + chalk.cyan('npx atxp email send') + ' ' + chalk.yellow('<options>') + '    ' + 'Send an email');
  console.log();
  console.log(chalk.bold('Send Options:'));
  console.log('  ' + chalk.yellow('--to') + ' ' + chalk.gray('<email>') + '      ' + 'Recipient email address (required)');
  console.log('  ' + chalk.yellow('--subject') + ' ' + chalk.gray('<text>') + '  ' + 'Email subject line (required)');
  console.log('  ' + chalk.yellow('--body') + ' ' + chalk.gray('<text>') + '     ' + 'Email body content (required)');
  console.log();
  console.log(chalk.bold('Examples:'));
  console.log('  npx atxp email inbox');
  console.log('  npx atxp email send --to user@example.com --subject "Hello" --body "Hi there!"');
  console.log();
  console.log(chalk.bold('Pricing:'));
  console.log('  Inbox check: ' + chalk.green('FREE'));
  console.log('  Send email:  ' + chalk.yellow('$0.01 per email'));
  console.log();
  console.log(chalk.bold('Your Email Address:'));
  console.log('  Each ATXP user gets a unique address: ' + chalk.cyan('{user_id}@atxp.email'));
}

export async function emailCommand(subCommand: string, options: EmailOptions): Promise<void> {
  if (!subCommand || subCommand === 'help' || subCommand === '--help' || subCommand === '-h') {
    showEmailHelp();
    return;
  }

  switch (subCommand) {
    case 'inbox':
      await checkInbox();
      break;

    case 'send':
      await sendEmail(options);
      break;

    default:
      console.error(chalk.red(`Unknown email command: ${subCommand}`));
      console.log();
      showEmailHelp();
      process.exit(1);
  }
}

async function checkInbox(): Promise<void> {
  const result = await callTool(SERVER, 'email_check_inbox', {});

  try {
    const parsed = JSON.parse(result);
    if (parsed.status === 'error') {
      console.error(chalk.red('Error: ' + parsed.errorMessage));
      process.exit(1);
    }

    console.log(chalk.bold('Inbox: ') + chalk.cyan(parsed.inboxAddress || 'Unknown'));
    console.log();

    if (!parsed.messages || parsed.messages.length === 0) {
      console.log(chalk.gray('No messages in inbox'));
      return;
    }

    console.log(chalk.bold(`${parsed.messages.length} message(s):`));
    console.log();

    for (const email of parsed.messages) {
      console.log(chalk.bold('From: ') + email.from);
      console.log(chalk.bold('Subject: ') + email.subject);
      console.log(chalk.bold('Date: ') + email.date);
      if (email.text) {
        console.log(chalk.bold('Body: ') + email.text.substring(0, 200) + (email.text.length > 200 ? '...' : ''));
      }
      console.log(chalk.gray('─'.repeat(50)));
    }
  } catch {
    // If not JSON, just print raw result
    console.log(result);
  }
}

async function sendEmail(options: EmailOptions): Promise<void> {
  const { to, subject, body } = options;

  if (!to) {
    console.error(chalk.red('Error: --to is required'));
    console.log(`Usage: ${chalk.cyan('npx atxp email send --to <email> --subject <subject> --body <body>')}`);
    process.exit(1);
  }

  if (!subject) {
    console.error(chalk.red('Error: --subject is required'));
    console.log(`Usage: ${chalk.cyan('npx atxp email send --to <email> --subject <subject> --body <body>')}`);
    process.exit(1);
  }

  if (!body) {
    console.error(chalk.red('Error: --body is required'));
    console.log(`Usage: ${chalk.cyan('npx atxp email send --to <email> --subject <subject> --body <body>')}`);
    process.exit(1);
  }

  const result = await callTool(SERVER, 'email_send_email', {
    to,
    subject,
    body,
  });

  try {
    const parsed = JSON.parse(result);
    if (parsed.status === 'error') {
      console.error(chalk.red('Error: ' + parsed.errorMessage));
      process.exit(1);
    }

    console.log(chalk.green('Email sent successfully!'));
    if (parsed.messageId) {
      console.log(chalk.gray('Message ID: ' + parsed.messageId));
    }
  } catch {
    // If not JSON, just print raw result
    console.log(result);
  }
}
