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
  console.log('  ' + chalk.cyan('npx atxp email inbox') + '                ' + 'Check your inbox');
  console.log('  ' + chalk.cyan('npx atxp email read') + ' ' + chalk.yellow('<messageId>') + '    ' + 'Read a specific message');
  console.log('  ' + chalk.cyan('npx atxp email send') + ' ' + chalk.yellow('<options>') + '      ' + 'Send an email');
  console.log();
  console.log(chalk.bold('Send Options:'));
  console.log('  ' + chalk.yellow('--to') + ' ' + chalk.gray('<email>') + '      ' + 'Recipient email address (required)');
  console.log('  ' + chalk.yellow('--subject') + ' ' + chalk.gray('<text>') + '  ' + 'Email subject line (required)');
  console.log('  ' + chalk.yellow('--body') + ' ' + chalk.gray('<text>') + '     ' + 'Email body content (required)');
  console.log();
  console.log(chalk.bold('Examples:'));
  console.log('  npx atxp email inbox');
  console.log('  npx atxp email read msg_abc123');
  console.log('  npx atxp email send --to user@example.com --subject "Hello" --body "Hi there!"');
  console.log();
  console.log(chalk.bold('Pricing:'));
  console.log('  Inbox check: ' + chalk.green('FREE'));
  console.log('  Read message: ' + chalk.green('FREE'));
  console.log('  Send email:  ' + chalk.yellow('$0.01 per email'));
  console.log();
  console.log(chalk.bold('Your Email Address:'));
  console.log('  Each ATXP user gets a unique address: ' + chalk.cyan('{user_id}@atxp.email'));
}

export async function emailCommand(subCommand: string, options: EmailOptions, messageId?: string): Promise<void> {
  if (!subCommand || subCommand === 'help' || subCommand === '--help' || subCommand === '-h') {
    showEmailHelp();
    return;
  }

  switch (subCommand) {
    case 'inbox':
      await checkInbox();
      break;

    case 'read':
      await readMessage(messageId);
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
      console.log(chalk.gray('ID: ' + email.messageId));
      console.log(chalk.bold('From: ') + email.from);
      console.log(chalk.bold('Subject: ') + email.subject);
      console.log(chalk.bold('Date: ') + email.date);
      console.log(chalk.gray('─'.repeat(50)));
    }

    console.log();
    console.log(chalk.gray('Use `npx atxp email read <messageId>` to read a message'));
  } catch {
    // If not JSON, just print raw result
    console.log(result);
  }
}

async function readMessage(messageId?: string): Promise<void> {
  if (!messageId) {
    console.error(chalk.red('Error: messageId is required'));
    console.log(`Usage: ${chalk.cyan('npx atxp email read <messageId>')}`);
    console.log(chalk.gray('Use `npx atxp email inbox` to see message IDs'));
    process.exit(1);
  }

  const result = await callTool(SERVER, 'email_get_message', { messageId });

  try {
    const parsed = JSON.parse(result);
    if (parsed.status === 'error') {
      console.error(chalk.red('Error: ' + parsed.errorMessage));
      process.exit(1);
    }

    if (parsed.inboxAddress) {
      console.log(chalk.bold('Your inbox: ') + chalk.cyan(parsed.inboxAddress));
      console.log();
    }

    const msg = parsed.message;
    console.log(chalk.bold('From: ') + msg.from);
    console.log(chalk.bold('To: ') + (Array.isArray(msg.to) ? msg.to.join(', ') : msg.to));
    console.log(chalk.bold('Subject: ') + msg.subject);
    console.log(chalk.bold('Date: ') + msg.date);
    console.log(chalk.gray('─'.repeat(50)));
    console.log();
    if (msg.text) {
      console.log(msg.text);
    } else if (msg.html) {
      console.log(chalk.gray('(HTML content - plain text not available)'));
      console.log(msg.html);
    } else {
      console.log(chalk.gray('(No message body)'));
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
    if (parsed.inboxAddress) {
      console.log(chalk.bold('Sent from: ') + chalk.cyan(parsed.inboxAddress));
    }
    if (parsed.messageId) {
      console.log(chalk.gray('Message ID: ' + parsed.messageId));
    }
  } catch {
    // If not JSON, just print raw result
    console.log(result);
  }
}
