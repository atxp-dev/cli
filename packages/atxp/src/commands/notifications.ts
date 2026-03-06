import chalk from 'chalk';
import fs from 'fs/promises';
import os from 'os';
import { execSync } from 'child_process';

const NOTIFICATIONS_BASE_URL = 'https://clowdbot-notifications.corp.circuitandchisel.com';
const OPENCLAW_CONFIG_PATH = '/data/.openclaw/openclaw.json';
const SESSIONS_PATH = '/data/.openclaw/agents/main/sessions/sessions.json';

// eslint-disable-next-line no-control-regex
const sanitizeSessionValue = (s: string) => s.replace(/[\x00-\x1f"`[\]]/g, '');

interface EnableResponse {
  instance?: { webhookUrl?: string; hooksToken?: string };
  webhook?: { id?: string; url?: string; eventTypes?: string[]; secret?: string; enabled?: boolean };
  error?: string;
}

interface NotificationChannel {
  channel: string;  // "telegram", "discord", "slack", etc.
  to: string;       // peer ID (chat ID, channel ID, etc.)
}

/**
 * Discover connected messaging channels by reading the local session store.
 * Parses session keys like "agent:main:telegram:direct:8204320066" to extract
 * the channel type and peer ID for each active DM session.
 */
async function discoverConnectedChannels(): Promise<NotificationChannel[]> {
  try {
    const raw = await fs.readFile(SESSIONS_PATH, 'utf-8');
    const sessions = JSON.parse(raw);
    const channels: NotificationChannel[] = [];
    const seen = new Set<string>();

    for (const key of Object.keys(sessions)) {
      // Match DM session keys: agent:main:<channel>:direct:<peerId>
      const match = key.match(/^agent:main:([^:]+):direct:(.+)$/);
      if (!match) continue;
      const channel = sanitizeSessionValue(match[1]).slice(0, 64);
      const to = sanitizeSessionValue(match[2]).slice(0, 128);
      if (!channel || !to) continue;
      // Skip ephemeral channels (webchat has no persistent address)
      if (channel === 'webchat') continue;
      const dedupKey = `${channel}:${to}`;
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);
      channels.push({ channel, to });
    }
    return channels;
  } catch {
    return []; // sessions file may not exist yet
  }
}

/**
 * Configure hooks token on the instance.
 * Only runs when inside a Fly instance (FLY_MACHINE_ID is set).
 * Sets hooks.enabled and hooks.token in openclaw.json, restarts gateway if changed.
 */
async function configureHooksOnInstance(hooksToken: string): Promise<void> {
  if (!process.env.FLY_MACHINE_ID) return;

  try {
    const raw = await fs.readFile(OPENCLAW_CONFIG_PATH, 'utf-8');
    const config = JSON.parse(raw);

    if (!config.hooks) config.hooks = {};
    if (config.hooks.token === hooksToken && config.hooks.enabled === true) return;

    config.hooks.enabled = true;
    config.hooks.token = hooksToken;
    await fs.writeFile(OPENCLAW_CONFIG_PATH, JSON.stringify(config, null, 2));

    try {
      execSync('pkill -f openclaw-gateway', { stdio: 'ignore' });
    } catch { /* gateway may not be running */ }
  } catch (err) {
    console.error(chalk.red(`Error configuring instance: ${err instanceof Error ? err.message : err}`));
  }
}

function getMachineId(): string | undefined {
  const flyId = process.env.FLY_MACHINE_ID;
  if (flyId) return flyId;

  // Fly sets hostname to the machine ID, but nested shells (e.g. the agent's
  // process) may not inherit FLY_MACHINE_ID. Only use hostname if it looks
  // like a Fly machine ID (hex string, typically 14 chars).
  const hostname = os.hostname();
  if (hostname && /^[0-9a-f]{10,}$/.test(hostname)) return hostname;

  return undefined;
}

async function getAccountId(): Promise<string | undefined> {
  try {
    const { getAccountInfo } = await import('./whoami.js');
    const account = await getAccountInfo();
    return account?.accountId;
  } catch {
    return undefined;
  }
}

async function enableNotifications(): Promise<void> {
  const machineId = getMachineId();
  if (!machineId) {
    console.error(chalk.red('Error: Could not detect Fly machine ID.'));
    console.log('This command must be run from inside a Clowdbot instance.');
    process.exit(1);
  }

  console.log(chalk.gray('Enabling push notifications...'));

  // Discover connected channels for delivery targeting
  const channels = await discoverConnectedChannels();

  // Resolve account ID for event matching
  const accountId = await getAccountId();

  const body: Record<string, unknown> = { machine_id: machineId };
  if (accountId) body.account_id = accountId;
  if (channels.length > 0) body.channels = channels;

  let res: Response;
  try {
    res = await fetch(`${NOTIFICATIONS_BASE_URL}/notifications/enable`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error(chalk.red(`Error: Could not reach notifications service.`));
    console.error(chalk.gray(`${err instanceof Error ? err.message : err}`));
    process.exit(1);
  }

  const data = await res.json().catch(() => ({})) as EnableResponse;
  if (!res.ok) {
    console.error(chalk.red(`Error: ${data.error || res.statusText}`));
    process.exit(1);
  }

  const { instance, webhook } = data;
  if (!instance?.webhookUrl || !instance?.hooksToken || !webhook) {
    console.error(chalk.red('Error: Unexpected response from notifications service.'));
    process.exit(1);
  }

  // Configure hooks locally
  await configureHooksOnInstance(instance.hooksToken);

  console.log(chalk.green('Push notifications enabled!'));
  console.log();
  console.log('  ' + chalk.bold('ID:') + '      ' + (webhook.id || ''));
  console.log('  ' + chalk.bold('URL:') + '     ' + (webhook.url || ''));
  console.log('  ' + chalk.bold('Events:') + '  ' + (webhook.eventTypes?.join(', ') || ''));
  if (channels.length > 0) {
    console.log('  ' + chalk.bold('Channels:') + ' ' + channels.map(c => `${c.channel}:${c.to}`).join(', '));
  }
  if (webhook.secret) {
    console.log('  ' + chalk.bold('Secret:') + '  ' + chalk.yellow(webhook.secret));
    console.log();
    console.log(chalk.gray('Save the secret — it will not be shown again.'));
    console.log(chalk.gray('Use it to verify webhook signatures (HMAC-SHA256).'));
  }
}

function showNotificationsHelp(): void {
  console.log(chalk.bold('Notifications Commands:'));
  console.log();
  console.log('  ' + chalk.cyan('npx atxp notifications enable') + '  ' + 'Enable push notifications (auto-configured)');
  console.log();
  console.log(chalk.bold('Available Events:'));
  console.log('  ' + chalk.green('email.received') + '   ' + 'Triggered when an inbound email arrives');
  console.log('  ' + chalk.green('sms.received') + '     ' + 'Triggered when an inbound SMS arrives');
  console.log();
  console.log(chalk.bold('Examples:'));
  console.log('  npx atxp notifications enable');
}

export async function notificationsCommand(subCommand: string): Promise<void> {
  if (process.argv.includes('--help') || process.argv.includes('-h') || !subCommand) {
    showNotificationsHelp();
    return;
  }

  switch (subCommand) {
    case 'enable':
      await enableNotifications();
      break;

    default:
      showNotificationsHelp();
      break;
  }
}
