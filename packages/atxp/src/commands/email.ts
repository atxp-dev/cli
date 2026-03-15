import { callTool } from '../call-tool.js';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import path from 'path';

const SERVER = 'email.mcp.atxp.ai';

interface EmailOptions {
  to?: string;
  subject?: string;
  body?: string;
  attach?: string[];
}

interface Attachment {
  filename: string;
  contentType: string;
  content: string;
}

const MIME_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.html': 'text/html',
  '.htm': 'text/html',
  '.zip': 'application/zip',
  '.gz': 'application/gzip',
  '.tar': 'application/x-tar',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

function loadAttachments(filePaths: string[]): Attachment[] {
  return filePaths.map((filePath) => {
    const resolved = path.resolve(filePath);
    const content = readFileSync(resolved);
    return {
      filename: path.basename(resolved),
      contentType: getMimeType(resolved),
      content: content.toString('base64'),
    };
  });
}

function showEmailHelp(): void {
  console.log(chalk.bold('Email Commands:'));
  console.log();
  console.log('  ' + chalk.cyan('npx atxp email inbox') + '                          ' + 'Check your inbox');
  console.log('  ' + chalk.cyan('npx atxp email read') + ' ' + chalk.yellow('<messageId>') + '              ' + 'Read a specific message');
  console.log('  ' + chalk.cyan('npx atxp email send') + ' ' + chalk.yellow('<options>') + '                ' + 'Send an email');
  console.log('  ' + chalk.cyan('npx atxp email reply') + ' ' + chalk.yellow('<messageId>') + ' ' + chalk.yellow('<options>') + '  ' + 'Reply to a message');
  console.log('  ' + chalk.cyan('npx atxp email search') + ' ' + chalk.yellow('<query>') + '              ' + 'Search emails');
  console.log('  ' + chalk.cyan('npx atxp email delete') + ' ' + chalk.yellow('<messageId>') + '           ' + 'Delete a message');
  console.log('  ' + chalk.cyan('npx atxp email get-attachment') + ' ' + chalk.yellow('<options>') + '     ' + 'Download an attachment');
  console.log('  ' + chalk.cyan('npx atxp email claim-username') + ' ' + chalk.yellow('<name>') + '        ' + 'Claim a username ($1.00)');
  console.log('  ' + chalk.cyan('npx atxp email release-username') + '               ' + 'Release your username');
  console.log();
  console.log(chalk.bold('Send/Reply Options:'));
  console.log('  ' + chalk.yellow('--to') + ' ' + chalk.gray('<email>') + '      ' + 'Recipient email address (required for send)');
  console.log('  ' + chalk.yellow('--subject') + ' ' + chalk.gray('<text>') + '  ' + 'Email subject line (required for send)');
  console.log('  ' + chalk.yellow('--body') + ' ' + chalk.gray('<text>') + '     ' + 'Email body content (required)');
  console.log('  ' + chalk.yellow('--attach') + ' ' + chalk.gray('<file>') + '   ' + 'Attach a file (repeatable)');
  console.log();
  console.log(chalk.bold('Get Attachment Options:'));
  console.log('  ' + chalk.yellow('--message') + ' ' + chalk.gray('<id>') + '    ' + 'Message ID (required)');
  console.log('  ' + chalk.yellow('--index') + ' ' + chalk.gray('<n>') + '       ' + 'Attachment index, 0-based (required)');
  console.log();
  console.log(chalk.bold('Examples:'));
  console.log('  npx atxp email inbox');
  console.log('  npx atxp email read msg_abc123');
  console.log('  npx atxp email send --to user@example.com --subject "Hello" --body "Hi there!"');
  console.log('  npx atxp email send --to user@example.com --subject "Report" --body "See attached." --attach report.pdf');
  console.log('  npx atxp email send --to user@example.com --subject "Files" --body "Two files." --attach a.pdf --attach b.png');
  console.log('  npx atxp email reply msg_abc123 --body "Thanks for your message!"');
  console.log('  npx atxp email reply msg_abc123 --body "Updated version attached." --attach report-v2.pdf');
  console.log('  npx atxp email search "invoice"');
  console.log('  npx atxp email delete msg_abc123');
  console.log('  npx atxp email get-attachment --message msg_abc123 --index 0');
  console.log('  npx atxp email claim-username myname');
  console.log('  npx atxp email release-username');
  console.log();
  console.log(chalk.bold('Pricing:'));
  console.log('  Inbox check:     ' + chalk.green('FREE'));
  console.log('  Read message:    ' + chalk.green('FREE'));
  console.log('  Search:          ' + chalk.green('FREE'));
  console.log('  Delete:          ' + chalk.green('FREE'));
  console.log('  Get attachment:  ' + chalk.green('FREE'));
  console.log('  Send email:      ' + chalk.yellow('$0.01 per email'));
  console.log('  Reply:           ' + chalk.yellow('$0.01 per reply'));
  console.log('  Claim username:  ' + chalk.yellow('$1.00'));
  console.log('  Release username: ' + chalk.green('FREE'));
  console.log();
  console.log(chalk.bold('Your Email Address:'));
  console.log('  Each ATXP user gets a unique address: ' + chalk.cyan('{user_id}@atxp.email'));
  console.log('  Claim a username to use ' + chalk.cyan('{username}@atxp.email') + ' instead.');
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

    case 'reply':
      await replyToEmail(messageId, options);
      break;

    case 'search':
      await searchEmails(messageId);
      break;

    case 'delete':
      await deleteEmail(messageId);
      break;

    case 'get-attachment':
      await getAttachment();
      break;

    case 'claim-username':
      await claimUsername(messageId);
      break;

    case 'release-username':
      await releaseUsernameCmd();
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
    if (parsed.aliases && parsed.aliases.length > 0) {
      console.log(chalk.bold('Aliases: ') + parsed.aliases.map((a: string) => chalk.cyan(a)).join(', '));
    }
    console.log();

    if (!parsed.messages || parsed.messages.length === 0) {
      console.log(chalk.gray('No messages in inbox'));
      return;
    }

    console.log(chalk.bold(`${parsed.messages.length} message(s):`));
    console.log();

    for (const email of parsed.messages) {
      const readIndicator = email.read === false ? chalk.yellow(' [UNREAD]') : '';
      const attachIndicator = email.attachments && email.attachments.length > 0
        ? chalk.magenta(` [${email.attachments.length} attachment(s)]`)
        : '';
      console.log(chalk.gray('ID: ' + email.messageId) + readIndicator + attachIndicator);
      console.log(chalk.bold('From: ') + email.from);
      console.log(chalk.bold('Subject: ') + email.subject);
      console.log(chalk.bold('Date: ') + email.date);
      if (email.attachments && email.attachments.length > 0) {
        for (let i = 0; i < email.attachments.length; i++) {
          const att = email.attachments[i];
          console.log(chalk.gray(`  [${i}] ${att.filename} (${att.contentType}, ${att.size} bytes)`));
        }
      }
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

    if (msg.attachments && msg.attachments.length > 0) {
      console.log();
      console.log(chalk.bold(`Attachments (${msg.attachments.length}):`));
      for (let i = 0; i < msg.attachments.length; i++) {
        const att = msg.attachments[i];
        console.log(`  [${i}] ${att.filename} (${att.contentType}, ${att.size} bytes)`);
      }
      console.log(chalk.gray('Use `npx atxp email get-attachment --message <id> --index <n>` to download'));
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

  const args: Record<string, unknown> = { to, subject, body };

  if (options.attach && options.attach.length > 0) {
    try {
      args.attachments = loadAttachments(options.attach);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(chalk.red('Error reading attachment: ' + msg));
      process.exit(1);
    }
  }

  const result = await callTool(SERVER, 'email_send_email', args);

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

async function replyToEmail(messageId?: string, options?: EmailOptions): Promise<void> {
  if (!messageId) {
    console.error(chalk.red('Error: messageId is required'));
    console.log(`Usage: ${chalk.cyan('npx atxp email reply <messageId> --body <body>')}`);
    process.exit(1);
  }

  const body = options?.body;
  if (!body) {
    console.error(chalk.red('Error: --body is required'));
    console.log(`Usage: ${chalk.cyan('npx atxp email reply <messageId> --body <body>')}`);
    process.exit(1);
  }

  const args: Record<string, unknown> = { messageId, body };

  if (options?.attach && options.attach.length > 0) {
    try {
      args.attachments = loadAttachments(options.attach);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(chalk.red('Error reading attachment: ' + msg));
      process.exit(1);
    }
  }

  const result = await callTool(SERVER, 'email_reply', args);

  try {
    const parsed = JSON.parse(result);
    if (parsed.status === 'error') {
      console.error(chalk.red('Error: ' + parsed.errorMessage));
      process.exit(1);
    }

    console.log(chalk.green('Reply sent successfully!'));
    if (parsed.inboxAddress) {
      console.log(chalk.bold('Sent from: ') + chalk.cyan(parsed.inboxAddress));
    }
    if (parsed.messageId) {
      console.log(chalk.gray('Message ID: ' + parsed.messageId));
    }
  } catch {
    console.log(result);
  }
}

async function searchEmails(query?: string): Promise<void> {
  if (!query) {
    console.error(chalk.red('Error: search query is required'));
    console.log(`Usage: ${chalk.cyan('npx atxp email search <query>')}`);
    process.exit(1);
  }

  const result = await callTool(SERVER, 'email_search', { query });

  try {
    const parsed = JSON.parse(result);
    if (parsed.status === 'error') {
      console.error(chalk.red('Error: ' + parsed.errorMessage));
      process.exit(1);
    }

    console.log(chalk.bold('Search results for: ') + chalk.yellow(query));
    console.log();

    if (!parsed.messages || parsed.messages.length === 0) {
      console.log(chalk.gray('No matching messages'));
      return;
    }

    console.log(chalk.bold(`${parsed.messages.length} result(s):`));
    console.log();

    for (const email of parsed.messages) {
      const readIndicator = email.read === false ? chalk.yellow(' [UNREAD]') : '';
      const attachIndicator = email.attachments && email.attachments.length > 0
        ? chalk.magenta(` [${email.attachments.length} attachment(s)]`)
        : '';
      console.log(chalk.gray('ID: ' + email.messageId) + readIndicator + attachIndicator);
      console.log(chalk.bold('From: ') + email.from);
      console.log(chalk.bold('Subject: ') + email.subject);
      console.log(chalk.bold('Date: ') + email.date);
      if (email.attachments && email.attachments.length > 0) {
        for (let i = 0; i < email.attachments.length; i++) {
          const att = email.attachments[i];
          console.log(chalk.gray(`  [${i}] ${att.filename} (${att.contentType}, ${att.size} bytes)`));
        }
      }
      console.log(chalk.gray('─'.repeat(50)));
    }
  } catch {
    console.log(result);
  }
}

async function deleteEmail(messageId?: string): Promise<void> {
  if (!messageId) {
    console.error(chalk.red('Error: messageId is required'));
    console.log(`Usage: ${chalk.cyan('npx atxp email delete <messageId>')}`);
    process.exit(1);
  }

  const result = await callTool(SERVER, 'email_delete', { messageId });

  try {
    const parsed = JSON.parse(result);
    if (parsed.status === 'error') {
      console.error(chalk.red('Error: ' + parsed.errorMessage));
      process.exit(1);
    }

    console.log(chalk.green('Message deleted.'));
  } catch {
    console.log(result);
  }
}

async function getAttachment(): Promise<void> {
  const getArgValue = (flag: string): string | undefined => {
    const index = process.argv.findIndex((arg) => arg === flag);
    return index !== -1 ? process.argv[index + 1] : undefined;
  };

  const messageId = getArgValue('--message');
  const indexStr = getArgValue('--index');

  if (!messageId || indexStr === undefined) {
    console.error(chalk.red('Error: --message and --index are required'));
    console.log(`Usage: ${chalk.cyan('npx atxp email get-attachment --message <messageId> --index <n>')}`);
    process.exit(1);
  }

  const attachmentIndex = parseInt(indexStr, 10);
  if (isNaN(attachmentIndex) || attachmentIndex < 0) {
    console.error(chalk.red('Error: --index must be a non-negative integer'));
    process.exit(1);
  }

  const result = await callTool(SERVER, 'email_get_attachment', { messageId, attachmentIndex });

  try {
    const parsed = JSON.parse(result);
    if (parsed.status === 'error') {
      console.error(chalk.red('Error: ' + parsed.errorMessage));
      process.exit(1);
    }

    console.log(chalk.bold('Filename: ') + parsed.filename);
    console.log(chalk.bold('Type: ') + parsed.contentType);
    console.log(chalk.bold('Size: ') + parsed.size + ' bytes');
    console.log(chalk.bold('Content (base64): '));
    console.log(parsed.content);
  } catch {
    console.log(result);
  }
}

async function claimUsername(username?: string): Promise<void> {
  if (!username) {
    console.error(chalk.red('Error: username is required'));
    console.log(`Usage: ${chalk.cyan('npx atxp email claim-username <username>')}`);
    console.log(chalk.gray('Username must be 3-32 chars, start with a letter, lowercase alphanumeric + hyphens + underscores.'));
    process.exit(1);
  }

  const result = await callTool(SERVER, 'email_claim_username', { username });

  try {
    const parsed = JSON.parse(result);
    if (parsed.status === 'error') {
      console.error(chalk.red('Error: ' + parsed.errorMessage));
      process.exit(1);
    }

    console.log(chalk.green('Username claimed successfully!'));
    console.log(chalk.bold('Username: ') + chalk.cyan(parsed.username));
    console.log(chalk.bold('Email address: ') + chalk.cyan(parsed.inboxAddress));
  } catch {
    console.log(result);
  }
}

async function releaseUsernameCmd(): Promise<void> {
  const result = await callTool(SERVER, 'email_release_username', {});

  try {
    const parsed = JSON.parse(result);
    if (parsed.status === 'error') {
      console.error(chalk.red('Error: ' + parsed.errorMessage));
      process.exit(1);
    }

    console.log(chalk.green('Username released. Your email address has reverted to {user_id}@atxp.email.'));
  } catch {
    console.log(result);
  }
}
