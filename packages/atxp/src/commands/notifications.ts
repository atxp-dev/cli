import chalk from 'chalk';
import fs from 'fs/promises';
import os from 'os';
import { execSync } from 'child_process';

const NOTIFICATIONS_BASE_URL = 'https://clowdbot-notifications.corp.circuitandchisel.com';

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
  const sessionsPath = '/data/.openclaw/agents/main/sessions/sessions.json';
  try {
    const raw = await fs.readFile(sessionsPath, 'utf-8');
    const sessions = JSON.parse(raw);
    const channels: NotificationChannel[] = [];
    const seen = new Set<string>();

    for (const key of Object.keys(sessions)) {
      // Match DM session keys: agent:main:<channel>:direct:<peerId>
      const match = key.match(/^agent:main:([^:]+):direct:(.+)$/);
      if (!match) continue;
      const [, channel, to] = match;
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
 * Build the HEARTBEAT.md content with notification relay instructions.
 * The default heartbeat prompt says "Read HEARTBEAT.md if it exists. Follow it strictly."
 * so writing these instructions directly to the file ensures the LLM relays
 * system events to all discovered channels.
 */
function buildHeartbeatMd(channels: NotificationChannel[]): string {
  const lines = [
    '# ATXP Notification Relay',
    '',
    'When you see System: event lines about new emails or SMS messages,',
    'you MUST immediately relay each one to the user.',
    'Do NOT reply HEARTBEAT_OK when System events are present.',
    '',
  ];

  if (channels.length > 0) {
    lines.push('Relay to ALL of these channels:');
    for (const c of channels) {
      lines.push(`- Use the message tool with channel="${c.channel}" and target="${c.to}"`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Configure hooks, heartbeat delivery target, and HEARTBEAT.md on the instance.
 * Only runs when inside a Fly instance (FLY_MACHINE_ID is set).
 *
 * Discovers all connected messaging channels from the session store, writes
 * HEARTBEAT.md with relay instructions for each channel, and sets the primary
 * delivery target to the first discovered channel.
 */
async function configureHooksOnInstance(hooksToken: string): Promise<void> {
  if (!process.env.FLY_MACHINE_ID) return;

  const configPath = '/data/.openclaw/openclaw.json';
  try {
    const raw = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(raw);

    // Discover connected channels from session store
    const channels = await discoverConnectedChannels();

    let changed = false;

    // Configure hooks
    if (!config.hooks) config.hooks = {};
    if (config.hooks.token !== hooksToken || config.hooks.enabled !== true) {
      config.hooks.enabled = true;
      config.hooks.token = hooksToken;
      changed = true;
    }

    // Set primary delivery target to first discovered channel
    if (!config.agents) config.agents = {};
    if (!config.agents.defaults) config.agents.defaults = {};
    if (!config.agents.defaults.heartbeat) config.agents.defaults.heartbeat = {};
    const hb = config.agents.defaults.heartbeat;

    if (channels.length > 0) {
      const primary = channels[0];
      if (hb.target !== primary.channel || hb.to !== primary.to) {
        hb.target = primary.channel;
        hb.to = primary.to;
        changed = true;
      }
    } else if (!hb.target) {
      hb.target = 'last';
      changed = true;
    }

    if (changed) {
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));
      console.log(chalk.gray('Hooks and heartbeat configured in openclaw.json'));
    }

    // Append notification relay instructions to HEARTBEAT.md.
    // The default heartbeat prompt reads this file and follows it strictly.
    const workspaceDir = '/data/.openclaw/workspace';
    await fs.mkdir(workspaceDir, { recursive: true });
    const heartbeatPath = `${workspaceDir}/HEARTBEAT.md`;
    const section = buildHeartbeatMd(channels);
    let existing = '';
    try { existing = await fs.readFile(heartbeatPath, 'utf-8'); } catch { /* file may not exist */ }
    // Replace existing notification section or append if not present
    const sectionStart = '# ATXP Notification Relay';
    if (existing.includes(sectionStart)) {
      // Replace from section header to next top-level heading or end of file
      const re = new RegExp(`${sectionStart}[\\s\\S]*?(?=\\n# |$)`);
      await fs.writeFile(heartbeatPath, existing.replace(re, section.trimEnd()));
    } else {
      const separator = existing.length > 0 && !existing.endsWith('\n') ? '\n\n' : existing.length > 0 ? '\n' : '';
      await fs.writeFile(heartbeatPath, existing + separator + section);
    }
    console.log(chalk.gray('HEARTBEAT.md updated with notification relay instructions'));

    if (channels.length > 0) {
      console.log(chalk.gray(`Notification channels: ${channels.map(c => `${c.channel}:${c.to}`).join(', ')}`));
    }

    // Restart gateway to pick up new config (watchdog auto-restarts it)
    if (changed) {
      try {
        execSync('pkill -f openclaw-gateway', { stdio: 'ignore' });
        console.log(chalk.gray('Gateway restarting to apply config...'));
      } catch {
        // Gateway may not be running yet — config will be picked up on next start
      }
    }
  } catch {
    // Non-fatal — hooks will be configured on next reboot via entrypoint config sync
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
  const { getAccountInfo } = await import('./whoami.js');
  const account = await getAccountInfo();
  return account?.accountId;
}

async function enableNotifications(): Promise<void> {
  const machineId = getMachineId();
  if (!machineId) {
    console.error(chalk.red('Error: Could not detect Fly machine ID.'));
    console.log('This command must be run from inside a Clowdbot instance.');
    process.exit(1);
  }

  console.log(chalk.gray('Enabling push notifications...'));

  // Resolve account ID for event matching
  const accountId = await getAccountId();

  const body: Record<string, string> = { machine_id: machineId };
  if (accountId) body.account_id = accountId;

  const res = await fetch(`${NOTIFICATIONS_BASE_URL}/notifications/enable`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

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
