import { callTool } from '../call-tool.js';
import chalk from 'chalk';

const SERVER = 'phone.mcp.atxp.ai';

export interface PhoneOptions {
  to?: string;
  body?: string;
  mediaUrls?: string[];
  instruction?: string;
  areaCode?: string;
  agentName?: string;
  knowledgeBase?: string[];
  voiceDescription?: string;
  knowledgeBaseContent?: string;
  unreadOnly?: boolean;
  direction?: string;
}

function showPhoneHelp(): void {
  console.log(chalk.bold('Phone Commands:'));
  console.log();
  console.log(chalk.bold('  Setup:'));
  console.log('  ' + chalk.cyan('npx atxp phone register') + ' ' + chalk.yellow('[--area-code <code>]') + '     ' + 'Register a phone number ($2.00)');
  console.log('  ' + chalk.cyan('npx atxp phone release') + '                            ' + 'Release your phone number');
  console.log('  ' + chalk.cyan('npx atxp phone configure-voice') + ' ' + chalk.yellow('<options>') + '        ' + 'Configure voice agent settings');
  console.log();
  console.log(chalk.bold('  SMS:'));
  console.log('  ' + chalk.cyan('npx atxp phone sms') + ' ' + chalk.yellow('[--unread-only] [--direction <dir>]') + '  ' + 'Check SMS inbox');
  console.log('  ' + chalk.cyan('npx atxp phone read-sms') + ' ' + chalk.yellow('<messageId>') + '             ' + 'Read a specific SMS');
  console.log('  ' + chalk.cyan('npx atxp phone send-sms') + ' ' + chalk.yellow('<options>') + '               ' + 'Send an SMS ($0.05)');
  console.log('  ' + chalk.cyan('npx atxp phone get-attachment') + ' ' + chalk.yellow('<options>') + '         ' + 'Download an MMS attachment');
  console.log();
  console.log(chalk.bold('  Voice:'));
  console.log('  ' + chalk.cyan('npx atxp phone call') + ' ' + chalk.yellow('<options>') + '                   ' + 'Make a voice call ($0.10)');
  console.log('  ' + chalk.cyan('npx atxp phone calls') + ' ' + chalk.yellow('[--direction <dir>]') + '       ' + 'Check call history');
  console.log('  ' + chalk.cyan('npx atxp phone read-call') + ' ' + chalk.yellow('<callId>') + '              ' + 'Read call details & transcript');
  console.log();
  console.log(chalk.bold('  Search:'));
  console.log('  ' + chalk.cyan('npx atxp phone search') + ' ' + chalk.yellow('<query>') + '                 ' + 'Search SMS and calls');
  console.log();
  console.log(chalk.bold('Send SMS Options:'));
  console.log('  ' + chalk.yellow('--to') + ' ' + chalk.gray('<number>') + '      ' + 'Recipient phone number in E.164 format (required)');
  console.log('  ' + chalk.yellow('--body') + ' ' + chalk.gray('<text>') + '      ' + 'Message body (required)');
  console.log('  ' + chalk.yellow('--media') + ' ' + chalk.gray('<url>') + '      ' + 'Media URL for MMS (can be repeated)');
  console.log();
  console.log(chalk.bold('Call Options:'));
  console.log('  ' + chalk.yellow('--to') + ' ' + chalk.gray('<number>') + '           ' + 'Phone number to call in E.164 format (required)');
  console.log('  ' + chalk.yellow('--instruction') + ' ' + chalk.gray('<text>') + '  ' + 'Instructions for the voice agent (required)');
  console.log();
  console.log(chalk.bold('Configure Voice Options:'));
  console.log('  ' + chalk.yellow('--agent-name') + ' ' + chalk.gray('<name>') + '          ' + 'Name the voice agent uses to introduce itself (required)');
  console.log('  ' + chalk.yellow('--voice-description') + ' ' + chalk.gray('<desc>') + '   ' + 'Natural language voice description (required)');
  console.log('  ' + chalk.yellow('--knowledge-base') + ' ' + chalk.gray('<glob>') + '      ' + 'Glob pattern for knowledge files (can be repeated)');
  console.log('  ' + chalk.yellow('--knowledge-content') + ' ' + chalk.gray('<text>') + '   ' + 'Inline knowledge base content');
  console.log();
  console.log(chalk.bold('Get Attachment Options:'));
  console.log('  ' + chalk.yellow('--message') + ' ' + chalk.gray('<id>') + '    ' + 'Message ID (required)');
  console.log('  ' + chalk.yellow('--index') + ' ' + chalk.gray('<n>') + '       ' + 'Attachment index, 0-based (required)');
  console.log();
  console.log(chalk.bold('Filter Options (sms / calls):'));
  console.log('  ' + chalk.yellow('--unread-only') + '          ' + 'Only show unread messages (sms only)');
  console.log('  ' + chalk.yellow('--direction') + ' ' + chalk.gray('<dir>') + '    ' + 'Filter by direction: "incoming" or "sent"');
  console.log();
  console.log(chalk.bold('Examples:'));
  console.log('  npx atxp phone register');
  console.log('  npx atxp phone register --area-code 415');
  console.log('  npx atxp phone sms');
  console.log('  npx atxp phone sms --unread-only');
  console.log('  npx atxp phone sms --direction incoming');
  console.log('  npx atxp phone sms --unread-only --direction incoming');
  console.log('  npx atxp phone read-sms sms_abc123');
  console.log('  npx atxp phone send-sms --to "+14155551234" --body "Hello!"');
  console.log('  npx atxp phone send-sms --to "+14155551234" --body "Check this" --media "https://example.com/image.jpg"');
  console.log('  npx atxp phone call --to "+14155551234" --instruction "Ask about their business hours"');
  console.log('  npx atxp phone calls');
  console.log('  npx atxp phone calls --direction sent');
  console.log('  npx atxp phone read-call call_abc123');
  console.log('  npx atxp phone configure-voice --agent-name "Alex" --voice-description "warm friendly female voice" --knowledge-base "docs/**/*.md"');
  console.log('  npx atxp phone search "appointment"');
  console.log('  npx atxp phone release');
  console.log();
  console.log(chalk.bold('Pricing:'));
  console.log('  Register number: ' + chalk.yellow('$2.00'));
  console.log('  Release number:  ' + chalk.green('FREE'));
  console.log('  Configure voice: ' + chalk.green('FREE'));
  console.log('  Check SMS:       ' + chalk.green('FREE'));
  console.log('  Read SMS:        ' + chalk.green('FREE'));
  console.log('  Send SMS:        ' + chalk.yellow('$0.05 per message'));
  console.log('  Get attachment:  ' + chalk.green('FREE'));
  console.log('  Make call:       ' + chalk.yellow('$0.10 per call'));
  console.log('  Check calls:     ' + chalk.green('FREE'));
  console.log('  Read call:       ' + chalk.green('FREE'));
  console.log('  Search:          ' + chalk.green('FREE'));
}

export async function phoneCommand(subCommand: string, options: PhoneOptions, positionalArg?: string): Promise<void> {
  if (!subCommand || subCommand === 'help' || subCommand === '--help' || subCommand === '-h') {
    showPhoneHelp();
    return;
  }

  switch (subCommand) {
    case 'register':
      await register(options);
      break;

    case 'release':
      await release();
      break;

    case 'configure-voice':
      await configureVoice(options);
      break;

    case 'sms':
      await checkSms(options);
      break;

    case 'read-sms':
      await readSms(positionalArg);
      break;

    case 'send-sms':
      await sendSms(options);
      break;

    case 'get-attachment':
      await getAttachment();
      break;

    case 'call':
      await makeCall(options);
      break;

    case 'calls':
      await checkCalls(options);
      break;

    case 'read-call':
      await readCall(positionalArg);
      break;

    case 'search':
      await searchPhone(positionalArg);
      break;

    default:
      console.error(chalk.red(`Unknown phone command: ${subCommand}`));
      console.log();
      showPhoneHelp();
      process.exit(1);
  }
}

async function register(options: PhoneOptions): Promise<void> {
  const args: Record<string, unknown> = {};
  if (options.areaCode) {
    args.area_code = options.areaCode;
  }

  const result = await callTool(SERVER, 'phone_register', args);

  try {
    const parsed = JSON.parse(result);
    if (parsed.status === 'error') {
      console.error(chalk.red('Error: ' + parsed.errorMessage));
      process.exit(1);
    }

    console.log(chalk.green('Phone number registered!'));
    console.log(chalk.bold('Number: ') + chalk.cyan(parsed.phoneNumber));
  } catch {
    console.log(result);
  }
}

async function release(): Promise<void> {
  const result = await callTool(SERVER, 'phone_release', {});

  try {
    const parsed = JSON.parse(result);
    if (parsed.status === 'error') {
      console.error(chalk.red('Error: ' + parsed.errorMessage));
      process.exit(1);
    }

    console.log(chalk.green('Phone number released.'));
  } catch {
    console.log(result);
  }
}

async function configureVoice(options: PhoneOptions): Promise<void> {
  const { agentName, knowledgeBase, voiceDescription, knowledgeBaseContent } = options;

  if (!agentName) {
    console.error(chalk.red('Error: --agent-name is required'));
    console.log(`Usage: ${chalk.cyan('npx atxp phone configure-voice --agent-name <name> --voice-description <desc>')}`);
    process.exit(1);
  }

  if (!voiceDescription) {
    console.error(chalk.red('Error: --voice-description is required'));
    console.log(`Usage: ${chalk.cyan('npx atxp phone configure-voice --agent-name <name> --voice-description <desc>')}`);
    process.exit(1);
  }

  const args: Record<string, unknown> = {
    agent_name: agentName,
    knowledge_base: knowledgeBase || [],
    voice_description: voiceDescription,
  };
  if (knowledgeBaseContent) {
    args.knowledge_base_content = knowledgeBaseContent;
  }

  const result = await callTool(SERVER, 'phone_configure_voice', args);

  try {
    const parsed = JSON.parse(result);
    if (parsed.status === 'error') {
      console.error(chalk.red('Error: ' + parsed.errorMessage));
      process.exit(1);
    }

    console.log(chalk.green('Voice configuration saved!'));
    console.log(chalk.bold('Agent name: ') + chalk.cyan(parsed.agentName));
    console.log(chalk.bold('Voice: ') + chalk.cyan(parsed.voiceDescription));
    if (parsed.matchedVoice) {
      console.log(chalk.bold('Matched voice: ') + chalk.cyan(parsed.matchedVoice.name));
    }
    if (parsed.knowledgeBase && parsed.knowledgeBase.length > 0) {
      console.log(chalk.bold('Knowledge base: ') + parsed.knowledgeBase.join(', '));
    }
  } catch {
    console.log(result);
  }
}

async function checkSms(options: PhoneOptions): Promise<void> {
  const args: Record<string, unknown> = {};
  if (options.unreadOnly) {
    args.unread_only = true;
  }
  if (options.direction) {
    args.direction = options.direction;
  }

  const result = await callTool(SERVER, 'phone_check_sms', args);

  try {
    const parsed = JSON.parse(result);
    if (parsed.status === 'error') {
      console.error(chalk.red('Error: ' + parsed.errorMessage));
      process.exit(1);
    }

    if (parsed.phoneNumber) {
      console.log(chalk.bold('Phone: ') + chalk.cyan(parsed.phoneNumber));
      console.log();
    }

    if (!parsed.messages || parsed.messages.length === 0) {
      console.log(chalk.gray('No SMS messages'));
      return;
    }

    console.log(chalk.bold(`${parsed.messages.length} message(s):`));
    console.log();

    for (const msg of parsed.messages) {
      const readIndicator = msg.read === false ? chalk.yellow(' [UNREAD]') : '';
      const dirIndicator = msg.direction === 'incoming' ? chalk.blue(' [IN]') : chalk.green(' [OUT]');
      console.log(chalk.gray('ID: ' + msg.id) + dirIndicator + readIndicator);
      console.log(chalk.bold('From: ') + msg.from);
      console.log(chalk.bold('To: ') + msg.to);
      if (msg.body) {
        console.log(chalk.bold('Body: ') + msg.body);
      }
      if (msg.mediaCount > 0) {
        console.log(chalk.bold('Media: ') + chalk.yellow(`${msg.mediaCount} attachment(s)`));
      }
      console.log(chalk.bold('Date: ') + msg.createdAt);
      console.log(chalk.gray('─'.repeat(50)));
    }

    console.log();
    console.log(chalk.gray('Use `npx atxp phone read-sms <id>` to read a message'));
  } catch {
    console.log(result);
  }
}

async function readSms(messageId?: string): Promise<void> {
  if (!messageId) {
    console.error(chalk.red('Error: message ID is required'));
    console.log(`Usage: ${chalk.cyan('npx atxp phone read-sms <messageId>')}`);
    console.log(chalk.gray('Use `npx atxp phone sms` to see message IDs'));
    process.exit(1);
  }

  const result = await callTool(SERVER, 'phone_get_sms', { message_id: messageId });

  try {
    const parsed = JSON.parse(result);
    if (parsed.status === 'error') {
      console.error(chalk.red('Error: ' + parsed.errorMessage));
      process.exit(1);
    }

    const msg = parsed.message;
    const dirIndicator = msg.direction === 'incoming' ? chalk.blue('[IN]') : chalk.green('[OUT]');
    console.log(chalk.bold('Direction: ') + dirIndicator);
    console.log(chalk.bold('From: ') + msg.from);
    console.log(chalk.bold('To: ') + msg.to);
    console.log(chalk.bold('Date: ') + msg.createdAt);
    console.log(chalk.gray('─'.repeat(50)));
    console.log();
    if (msg.body) {
      console.log(msg.body);
    } else {
      console.log(chalk.gray('(No message body)'));
    }

    if (msg.attachments && msg.attachments.length > 0) {
      console.log();
      console.log(chalk.bold(`Attachments (${msg.attachments.length}):`));
      for (const att of msg.attachments) {
        console.log(`  [${att.index}] ${att.contentType || 'unknown type'}`);
      }
      console.log(chalk.gray('Use `npx atxp phone get-attachment --message <id> --index <n>` to download'));
    }
  } catch {
    console.log(result);
  }
}

async function sendSms(options: PhoneOptions): Promise<void> {
  const { to, body } = options;

  if (!to) {
    console.error(chalk.red('Error: --to is required'));
    console.log(`Usage: ${chalk.cyan('npx atxp phone send-sms --to <number> --body <text>')}`);
    process.exit(1);
  }

  if (!body) {
    console.error(chalk.red('Error: --body is required'));
    console.log(`Usage: ${chalk.cyan('npx atxp phone send-sms --to <number> --body <text>')}`);
    process.exit(1);
  }

  const args: Record<string, unknown> = { to, body };
  if (options.mediaUrls && options.mediaUrls.length > 0) {
    args.media_urls = options.mediaUrls;
  }

  const result = await callTool(SERVER, 'phone_send_sms', args);

  try {
    const parsed = JSON.parse(result);
    if (parsed.status === 'error') {
      console.error(chalk.red('Error: ' + parsed.errorMessage));
      process.exit(1);
    }

    console.log(chalk.green('SMS sent!'));
    if (parsed.sid) {
      console.log(chalk.gray('SID: ' + parsed.sid));
    }
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
    console.log(`Usage: ${chalk.cyan('npx atxp phone get-attachment --message <messageId> --index <n>')}`);
    process.exit(1);
  }

  const attachmentIndex = parseInt(indexStr, 10);
  if (isNaN(attachmentIndex) || attachmentIndex < 0) {
    console.error(chalk.red('Error: --index must be a non-negative integer'));
    process.exit(1);
  }

  const result = await callTool(SERVER, 'phone_get_attachment', { message_id: messageId, attachment_index: attachmentIndex });

  try {
    const parsed = JSON.parse(result);
    if (parsed.status === 'error') {
      console.error(chalk.red('Error: ' + parsed.errorMessage));
      process.exit(1);
    }

    console.log(chalk.bold('Type: ') + parsed.contentType);
    console.log(chalk.bold('Size: ') + parsed.size + ' bytes');
    console.log(chalk.bold('Content (base64): '));
    console.log(parsed.content);
  } catch {
    console.log(result);
  }
}

async function makeCall(options: PhoneOptions): Promise<void> {
  const { to, instruction } = options;

  if (!to) {
    console.error(chalk.red('Error: --to is required'));
    console.log(`Usage: ${chalk.cyan('npx atxp phone call --to <number> --instruction <text>')}`);
    process.exit(1);
  }

  if (!instruction) {
    console.error(chalk.red('Error: --instruction is required'));
    console.log(`Usage: ${chalk.cyan('npx atxp phone call --to <number> --instruction <text>')}`);
    process.exit(1);
  }

  const result = await callTool(SERVER, 'phone_call', { to, instruction });

  try {
    const parsed = JSON.parse(result);
    if (parsed.status === 'error') {
      console.error(chalk.red('Error: ' + parsed.errorMessage));
      process.exit(1);
    }

    console.log(chalk.green('Call initiated!'));
    console.log(chalk.gray('Call ID: ' + parsed.callId));
    console.log();
    console.log(chalk.gray('The call is in progress. Use `npx atxp phone calls` to check status.'));
    console.log(chalk.gray('Use `npx atxp phone read-call <callId>` for transcript and summary when complete.'));
  } catch {
    console.log(result);
  }
}

async function checkCalls(options: PhoneOptions): Promise<void> {
  const args: Record<string, unknown> = {};
  if (options.direction) {
    args.direction = options.direction;
  }

  const result = await callTool(SERVER, 'phone_check_calls', args);

  try {
    const parsed = JSON.parse(result);
    if (parsed.status === 'error') {
      console.error(chalk.red('Error: ' + parsed.errorMessage));
      process.exit(1);
    }

    if (parsed.phoneNumber) {
      console.log(chalk.bold('Phone: ') + chalk.cyan(parsed.phoneNumber));
      console.log();
    }

    if (!parsed.calls || parsed.calls.length === 0) {
      console.log(chalk.gray('No call records'));
      return;
    }

    console.log(chalk.bold(`${parsed.calls.length} call(s):`));
    console.log();

    for (const call of parsed.calls) {
      const dirIndicator = call.direction === 'incoming' ? chalk.blue(' [IN]') : chalk.green(' [OUT]');
      console.log(chalk.gray('ID: ' + call.id) + dirIndicator);
      console.log(chalk.bold('From: ') + call.from);
      console.log(chalk.bold('To: ') + call.to);
      console.log(chalk.bold('Status: ') + call.status);
      if (call.duration !== null) {
        console.log(chalk.bold('Duration: ') + call.duration + 's');
      }
      if (call.summary) {
        console.log(chalk.bold('Summary: ') + call.summary);
      }
      console.log(chalk.bold('Date: ') + call.createdAt);
      console.log(chalk.gray('─'.repeat(50)));
    }

    console.log();
    console.log(chalk.gray('Use `npx atxp phone read-call <callId>` for full details'));
  } catch {
    console.log(result);
  }
}

async function readCall(callId?: string): Promise<void> {
  if (!callId) {
    console.error(chalk.red('Error: call ID is required'));
    console.log(`Usage: ${chalk.cyan('npx atxp phone read-call <callId>')}`);
    console.log(chalk.gray('Use `npx atxp phone calls` to see call IDs'));
    process.exit(1);
  }

  const result = await callTool(SERVER, 'phone_get_call', { call_id: callId });

  try {
    const parsed = JSON.parse(result);
    if (parsed.status === 'error') {
      console.error(chalk.red('Error: ' + parsed.errorMessage));
      process.exit(1);
    }

    const call = parsed.call;
    const dirIndicator = call.direction === 'incoming' ? chalk.blue('[IN]') : chalk.green('[OUT]');
    console.log(chalk.bold('Direction: ') + dirIndicator);
    console.log(chalk.bold('From: ') + call.from);
    console.log(chalk.bold('To: ') + call.to);
    console.log(chalk.bold('Status: ') + call.status);
    if (call.duration !== null) {
      console.log(chalk.bold('Duration: ') + call.duration + 's');
    }
    console.log(chalk.bold('Date: ') + call.createdAt);
    if (call.hasRecording) {
      console.log(chalk.bold('Recording: ') + chalk.green('Available'));
    }
    console.log(chalk.gray('─'.repeat(50)));

    if (call.instruction) {
      console.log();
      console.log(chalk.bold('Instruction:'));
      console.log(call.instruction);
    }

    if (call.summary) {
      console.log();
      console.log(chalk.bold('Summary:'));
      console.log(call.summary);
    }

    if (call.actionItems && call.actionItems.length > 0) {
      console.log();
      console.log(chalk.bold('Action Items:'));
      for (const item of call.actionItems) {
        console.log('  • ' + item);
      }
    }

    if (call.transcript) {
      console.log();
      console.log(chalk.bold('Transcript:'));
      console.log(call.transcript);
    }
  } catch {
    console.log(result);
  }
}

async function searchPhone(query?: string): Promise<void> {
  if (!query) {
    console.error(chalk.red('Error: search query is required'));
    console.log(`Usage: ${chalk.cyan('npx atxp phone search <query>')}`);
    process.exit(1);
  }

  const result = await callTool(SERVER, 'phone_search', { query });

  try {
    const parsed = JSON.parse(result);
    if (parsed.status === 'error') {
      console.error(chalk.red('Error: ' + parsed.errorMessage));
      process.exit(1);
    }

    console.log(chalk.bold('Search results for: ') + chalk.yellow(query));
    console.log();

    const hasSms = parsed.sms && parsed.sms.length > 0;
    const hasCalls = parsed.calls && parsed.calls.length > 0;

    if (!hasSms && !hasCalls) {
      console.log(chalk.gray('No matching results'));
      return;
    }

    if (hasSms) {
      console.log(chalk.bold(`SMS (${parsed.sms.length}):`));
      console.log();
      for (const msg of parsed.sms) {
        const readIndicator = msg.read === false ? chalk.yellow(' [UNREAD]') : '';
        const dirIndicator = msg.direction === 'incoming' ? chalk.blue(' [IN]') : chalk.green(' [OUT]');
        console.log(chalk.gray('ID: ' + msg.id) + dirIndicator + readIndicator);
        console.log(chalk.bold('From: ') + msg.from + chalk.bold(' To: ') + msg.to);
        if (msg.body) {
          console.log(chalk.bold('Body: ') + msg.body);
        }
        console.log(chalk.bold('Date: ') + msg.createdAt);
        console.log(chalk.gray('─'.repeat(50)));
      }
    }

    if (hasCalls) {
      if (hasSms) console.log();
      console.log(chalk.bold(`Calls (${parsed.calls.length}):`));
      console.log();
      for (const call of parsed.calls) {
        const dirIndicator = call.direction === 'incoming' ? chalk.blue(' [IN]') : chalk.green(' [OUT]');
        console.log(chalk.gray('ID: ' + call.id) + dirIndicator);
        console.log(chalk.bold('From: ') + call.from + chalk.bold(' To: ') + call.to);
        console.log(chalk.bold('Status: ') + call.status);
        if (call.summary) {
          console.log(chalk.bold('Summary: ') + call.summary);
        }
        console.log(chalk.bold('Date: ') + call.createdAt);
        console.log(chalk.gray('─'.repeat(50)));
      }
    }
  } catch {
    console.log(result);
  }
}
