import chalk from 'chalk';
import fs from 'fs/promises';
import os from 'os';
import { execSync } from 'child_process';
import { getConnection } from '../config.js';

const NOTIFICATIONS_BASE_URL = 'https://clowdbot-notifications.corp.circuitandchisel.com';

function getNotificationsAuth(): { baseUrl: string; token: string } {
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
  return { baseUrl: NOTIFICATIONS_BASE_URL, token };
}


function getArgValue(flag: string): string | undefined {
  const index = process.argv.findIndex((arg) => arg === flag);
  return index !== -1 ? process.argv[index + 1] : undefined;
}

function showNotificationsHelp(): void {
  console.log(chalk.bold('Notifications Commands:'));
  console.log();
  console.log('  ' + chalk.cyan('npx atxp notifications enable') + '              ' + 'Enable push notifications (auto-configured)');
  console.log('  ' + chalk.cyan('npx atxp notifications list') + '                ' + 'List your notification webhooks');
  console.log('  ' + chalk.cyan('npx atxp notifications remove <id>') + '         ' + 'Remove a notification webhook');
  console.log('  ' + chalk.cyan('npx atxp notifications test <id>') + '           ' + 'Send a test event');
  console.log('  ' + chalk.cyan('npx atxp notifications re-enable <id>') + '      ' + 'Re-enable a disabled webhook');
  console.log('  ' + chalk.cyan('npx atxp notifications rotate-secret <id>') + '  ' + 'Rotate the signing secret');
  console.log('  ' + chalk.cyan('npx atxp notifications failures') + '            ' + 'List failed deliveries');
  console.log('  ' + chalk.cyan('npx atxp notifications replay <id>') + '         ' + 'Replay a failed delivery');
  console.log();
  console.log(chalk.bold('Failures Options:'));
  console.log('  ' + chalk.yellow('--since') + '    ' + 'Time filter (e.g., 1h, 24h, 7d)');
  console.log();
  console.log(chalk.bold('Available Events:'));
  console.log('  ' + chalk.green('email.received') + '   ' + 'Triggered when an inbound email arrives');
  console.log();
  console.log(chalk.bold('Examples:'));
  console.log('  npx atxp notifications enable');
  console.log('  npx atxp notifications list');
  console.log('  npx atxp notifications test abc123');
  console.log('  npx atxp notifications failures --since 24h');
  console.log('  npx atxp notifications replay def456');
}

async function apiRequest(
  method: string,
  path: string,
  body?: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const { baseUrl, token } = getNotificationsAuth();
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json() as Record<string, unknown>;

  if (!res.ok) {
    const errorMsg = (data.error as string) || res.statusText;
    console.error(chalk.red(`Error: ${errorMsg}`));
    if (data.details) {
      const details = data.details as string[];
      for (const d of details) {
        console.error(chalk.red(`  - ${d}`));
      }
    }
    process.exit(1);
  }

  return data;
}


/**
 * Configure hooks in openclaw.json on the running instance.
 * Only runs when inside a Fly instance (FLY_MACHINE_ID is set).
 * Updates openclaw.json with the hooks token and restarts the gateway.
 */
async function configureHooksOnInstance(hooksToken: string): Promise<void> {
  if (!process.env.FLY_MACHINE_ID) return;

  const configPath = '/data/.openclaw/openclaw.json';
  try {
    const raw = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(raw);

    if (!config.hooks) config.hooks = {};
    // Already configured with this token — skip
    if (config.hooks.token === hooksToken && config.hooks.enabled === true) return;

    config.hooks.enabled = true;
    config.hooks.token = hooksToken;
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    console.log(chalk.gray('Hooks configured in openclaw.json'));

    // Restart gateway to pick up new config (watchdog auto-restarts it)
    try {
      execSync('pkill -f openclaw-gateway', { stdio: 'ignore' });
      console.log(chalk.gray('Gateway restarting to apply hooks config...'));
    } catch {
      // Gateway may not be running yet — config will be picked up on next start
    }
  } catch {
    // Non-fatal — hooks will be configured on next reboot via entrypoint config sync
  }
}

/**
 * Send a one-time instruction to the agent via /hooks/wake so it saves
 * notification handling instructions to its HEARTBEAT.md file.
 */
async function sendHeartbeatInstruction(webhookUrl: string, hooksToken: string): Promise<void> {
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${hooksToken}`,
      },
      body: JSON.stringify({
        text: 'SYSTEM: Push notifications are now enabled. Save the following text EXACTLY as-is to your HEARTBEAT.md file:\n\n# Notifications\n\nWhen you receive a message from /hooks/wake, it is a system event (e.g. inbound email). Do NOT just reply in the current chat. You MUST proactively use the message tool to broadcast the notification to every connected channel. Check your available tools, find all messaging channels, and send the notification to each one individually. The goal is that the owner sees the notification regardless of which channel they are watching.',
      }),
    });
    console.log(chalk.gray('Notification instructions sent to your agent.'));
  } catch {
    console.log(chalk.gray('Note: Could not send setup instruction to instance.'));
  }
}

function getMachineId(): string | undefined {
  // Fly sets FLY_MACHINE_ID on the VM, but nested shells (e.g. the agent's
  // process) may not inherit it. Fall back to hostname which Fly sets to the
  // machine ID.
  return process.env.FLY_MACHINE_ID || os.hostname() || undefined;
}

async function getEmailUserId(): Promise<string | undefined> {
  const { getAccountInfo } = await import('./whoami.js');
  const account = await getAccountInfo();
  if (!account?.email) return undefined;
  // Extract local part: agent_xyz@atxp.email -> agent_xyz
  return account.email.split('@')[0];
}

async function enableNotifications(): Promise<void> {
  const machineId = getMachineId();
  if (!machineId) {
    console.error(chalk.red('Error: Could not detect machine ID.'));
    console.log('This command must be run from inside a Clowdbot instance.');
    process.exit(1);
  }

  console.log(chalk.gray('Enabling push notifications...'));

  // Resolve email user ID for event matching
  const emailUserId = await getEmailUserId();

  const body: Record<string, string> = { machine_id: machineId };
  if (emailUserId) body.email_user_id = emailUserId;

  const res = await fetch(`${NOTIFICATIONS_BASE_URL}/notifications/enable`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json() as Record<string, unknown>;
  if (!res.ok) {
    const errorMsg = (data.error as string) || res.statusText;
    console.error(chalk.red(`Error: ${errorMsg}`));
    process.exit(1);
  }

  const instance = data.instance as { webhookUrl: string; hooksToken: string };
  const webhook = data.webhook as Record<string, unknown>;

  // Configure hooks locally
  await configureHooksOnInstance(instance.hooksToken);

  console.log(chalk.green('Push notifications enabled!'));
  console.log();
  console.log('  ' + chalk.bold('ID:') + '      ' + webhook.id);
  console.log('  ' + chalk.bold('URL:') + '     ' + webhook.url);
  console.log('  ' + chalk.bold('Events:') + '  ' + (webhook.eventTypes as string[]).join(', '));
  if (webhook.secret) {
    console.log('  ' + chalk.bold('Secret:') + '  ' + chalk.yellow(webhook.secret as string));
    console.log();
    console.log(chalk.gray('Save the secret — it will not be shown again.'));
    console.log(chalk.gray('Use it to verify webhook signatures (HMAC-SHA256).'));
  }

  // Send one-time HEARTBEAT.md instruction to the agent
  await sendHeartbeatInstruction(instance.webhookUrl, instance.hooksToken);
}

async function listWebhooks(): Promise<void> {
  const data = await apiRequest('GET', '/webhooks');
  const webhooks = data.webhooks as Array<Record<string, unknown>>;

  if (!webhooks || webhooks.length === 0) {
    console.log(chalk.gray('No webhooks registered.'));
    console.log(`Enable notifications: ${chalk.cyan('npx atxp notifications enable')}`);
    return;
  }

  console.log(chalk.bold(`Webhooks (${webhooks.length}):`));
  console.log();

  for (const wh of webhooks) {
    const status = wh.enabled
      ? chalk.green('enabled')
      : chalk.red(`disabled (${wh.consecutiveFailures} failures)`);

    console.log('  ' + chalk.bold(wh.id as string));
    console.log('    URL:     ' + (wh.url as string));
    console.log('    Events:  ' + (wh.eventTypes as string[]).join(', '));
    console.log('    Auth:    ' + (wh.hasAuthHeader ? chalk.green('configured') : chalk.gray('none')));
    console.log('    Status:  ' + status);
    console.log();
  }
}

async function removeWebhook(id: string): Promise<void> {
  if (!id) {
    console.error(chalk.red('Error: Webhook ID is required'));
    console.log(`Usage: ${chalk.cyan('npx atxp notifications remove <id>')}`);
    process.exit(1);
  }

  await apiRequest('DELETE', `/webhooks/${id}`);
  console.log(chalk.green('Webhook removed.'));
}

async function testWebhook(id: string): Promise<void> {
  if (!id) {
    console.error(chalk.red('Error: Webhook ID is required'));
    console.log(`Usage: ${chalk.cyan('npx atxp notifications test <id>')}`);
    process.exit(1);
  }

  await apiRequest('POST', `/webhooks/${id}/test`);
  console.log(chalk.green('Test event dispatched.'));
}

async function reEnableWebhook(id: string): Promise<void> {
  if (!id) {
    console.error(chalk.red('Error: Webhook ID is required'));
    console.log(`Usage: ${chalk.cyan('npx atxp notifications re-enable <id>')}`);
    process.exit(1);
  }

  await apiRequest('POST', `/webhooks/${id}/enable`);
  console.log(chalk.green('Webhook re-enabled. Failure counter reset.'));
}

async function rotateSecret(id: string): Promise<void> {
  if (!id) {
    console.error(chalk.red('Error: Webhook ID is required'));
    console.log(`Usage: ${chalk.cyan('npx atxp notifications rotate-secret <id>')}`);
    process.exit(1);
  }

  const data = await apiRequest('POST', `/webhooks/${id}/rotate-secret`);

  console.log(chalk.green('Secret rotated.'));
  console.log();
  console.log('  ' + chalk.bold('New Secret:') + '  ' + chalk.yellow(data.secret as string));
  console.log();
  console.log(chalk.gray('Save the secret — it will not be shown again.'));
  console.log(chalk.gray('The old secret is invalid immediately.'));
}

async function listFailures(): Promise<void> {
  const since = getArgValue('--since') || '24h';
  const data = await apiRequest('GET', `/webhooks/failures?since=${since}`);
  const failures = data.failures as Array<Record<string, unknown>>;

  if (!failures || failures.length === 0) {
    console.log(chalk.green(`No failed deliveries in the last ${since}.`));
    return;
  }

  console.log(chalk.bold(`Failed Deliveries (${failures.length}):`));
  console.log();

  for (const f of failures) {
    console.log('  ' + chalk.bold(f.id as string));
    console.log('    Webhook:  ' + (f.webhookUrl as string));
    console.log('    Event:    ' + (f.eventType as string));
    console.log('    Attempts: ' + f.attempts);
    console.log('    Failed:   ' + (f.lastAttemptAt as string));
    console.log();
  }

  console.log(chalk.gray('Replay with: npx atxp notifications replay <id>'));
}

async function replayFailure(id: string): Promise<void> {
  if (!id) {
    console.error(chalk.red('Error: Delivery ID is required'));
    console.log(`Usage: ${chalk.cyan('npx atxp notifications replay <id>')}`);
    process.exit(1);
  }

  await apiRequest('POST', `/webhooks/failures/${id}/replay`);
  console.log(chalk.green('Delivery replayed.'));
}

export async function notificationsCommand(subCommand: string, positionalArg?: string): Promise<void> {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showNotificationsHelp();
    return;
  }

  switch (subCommand) {
    case 'enable':
    case 'add': // backward compat
      await enableNotifications();
      break;

    case 'list':
    case 'ls':
      await listWebhooks();
      break;

    case 'remove':
    case 'rm':
      await removeWebhook(positionalArg || '');
      break;

    case 'test':
      await testWebhook(positionalArg || '');
      break;

    case 're-enable':
      await reEnableWebhook(positionalArg || '');
      break;

    case 'rotate-secret':
      await rotateSecret(positionalArg || '');
      break;

    case 'failures':
      await listFailures();
      break;

    case 'replay':
      await replayFailure(positionalArg || '');
      break;

    default:
      showNotificationsHelp();
      break;
  }
}
