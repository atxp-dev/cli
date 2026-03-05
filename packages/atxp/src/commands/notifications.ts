import chalk from 'chalk';
import fs from 'fs/promises';
import os from 'os';
import { execSync } from 'child_process';

const NOTIFICATIONS_BASE_URL = 'https://clowdbot-notifications.corp.circuitandchisel.com';

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
  const flyId = process.env.FLY_MACHINE_ID;
  if (flyId) return flyId;

  // Fly sets hostname to the machine ID, but nested shells (e.g. the agent's
  // process) may not inherit FLY_MACHINE_ID. Only use hostname if it looks
  // like a Fly machine ID (hex string, typically 14 chars).
  const hostname = os.hostname();
  if (hostname && /^[0-9a-f]{10,}$/.test(hostname)) return hostname;

  return undefined;
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
    console.error(chalk.red('Error: Could not detect Fly machine ID.'));
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

  const instance = data.instance as { webhookUrl?: string; hooksToken?: string } | undefined;
  const webhook = data.webhook as Record<string, unknown> | undefined;

  if (!instance?.webhookUrl || !instance?.hooksToken || !webhook) {
    console.error(chalk.red('Error: Unexpected response from notifications service.'));
    process.exit(1);
  }

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

function showNotificationsHelp(): void {
  console.log(chalk.bold('Notifications Commands:'));
  console.log();
  console.log('  ' + chalk.cyan('npx atxp notifications enable') + '  ' + 'Enable push notifications (auto-configured)');
  console.log();
  console.log(chalk.bold('Available Events:'));
  console.log('  ' + chalk.green('email.received') + '   ' + 'Triggered when an inbound email arrives');
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
