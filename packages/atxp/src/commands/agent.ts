import chalk from 'chalk';
import { createInterface } from 'readline';
import { getConnection } from '../config.js';

const DEFAULT_ACCOUNTS_URL = 'https://accounts.atxp.ai';

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

function getBaseUrl(): string {
  const connection = getConnection();
  if (connection) {
    try {
      const url = new URL(connection);
      return `${url.protocol}//${url.host}`;
    } catch {
      // Fall through to default
    }
  }
  return DEFAULT_ACCOUNTS_URL;
}

function showAgentHelp(): void {
  console.log(chalk.bold('Agent Commands:'));
  console.log();
  console.log('  ' + chalk.cyan('npx atxp agent create') + '      ' + 'Create a new agent account (requires login)');
  console.log('  ' + chalk.cyan('npx atxp agent list') + '        ' + 'List your agents (requires login)');
  console.log('  ' + chalk.cyan('npx atxp agent register') + '    ' + 'Self-register as an agent (no login required)');
  console.log();
  console.log(chalk.bold('Details:'));
  console.log('  Each agent gets:');
  console.log('    - A unique email address ({agentId}@atxp.email)');
  console.log('    - An Ethereum wallet');
  console.log('    - 10 IOU tokens to start');
  console.log('    - A connection token for SDK/CLI access');
  console.log();
  console.log(chalk.bold('Register Options:'));
  console.log('  ' + chalk.yellow('--server') + '           ' + 'Accounts server URL (default: https://accounts.atxp.ai)');
  console.log('  ' + chalk.yellow('--answer') + '           ' + 'Provide the challenge answer non-interactively');
  console.log('  ' + chalk.yellow('--registration-id') + '  ' + 'Resume a previous challenge (skip fetching a new one)');
  console.log();
  console.log(chalk.bold('Examples:'));
  console.log('  npx atxp agent create');
  console.log('  npx atxp agent list');
  console.log('  npx atxp agent register');
  console.log('  npx atxp agent register --server http://localhost:8016');
  console.log('  npx atxp agent register --registration-id reg_xxx --answer "535.00"');
  console.log('  CONNECTION_TOKEN=<agent_token> npx atxp email inbox');
}

export async function agentCommand(subCommand: string): Promise<void> {
  if (!subCommand || subCommand === 'help' || subCommand === '--help' || subCommand === '-h') {
    showAgentHelp();
    return;
  }

  switch (subCommand) {
    case 'create':
      await createAgent();
      break;

    case 'list':
      await listAgents();
      break;

    case 'register':
      await registerAgent();
      break;

    default:
      console.error(chalk.red(`Unknown agent command: ${subCommand}`));
      console.log();
      showAgentHelp();
      process.exit(1);
  }
}

async function createAgent(): Promise<void> {
  const { baseUrl, token } = getAccountsAuth();

  console.log(chalk.gray('Creating agent...'));

  const res = await fetch(`${baseUrl}/agents`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.error(chalk.red(`Error: ${(body as Record<string, string>).error || res.statusText}`));
    process.exit(1);
  }

  const data = await res.json() as {
    agentId: string;
    email: string;
    atxpAccountId: string;
    connectionToken: string;
    connectionString: string;
    walletAddress: string;
    fundedAmount: string;
  };

  console.log();
  console.log(chalk.green.bold('Agent created successfully!'));
  console.log();
  console.log('  ' + chalk.bold('Agent ID:') + '          ' + data.agentId);
  console.log('  ' + chalk.bold('Email:') + '             ' + chalk.cyan(data.email));
  console.log('  ' + chalk.bold('Account ID:') + '        ' + data.atxpAccountId);
  console.log('  ' + chalk.bold('Connection Token:') + '  ' + data.connectionToken);
  console.log('  ' + chalk.bold('Wallet:') + '            ' + data.walletAddress);
  console.log('  ' + chalk.bold('Funded:') + '            ' + data.fundedAmount + ' IOU');
  console.log();
  console.log(chalk.bold('Connection String:'));
  console.log('  ' + chalk.cyan(data.connectionString));
  console.log();
  console.log(chalk.bold('Use this to authenticate as the agent:'));
  console.log('  ' + chalk.yellow(`CONNECTION_TOKEN=${data.connectionToken} npx atxp email inbox`));
}

function getArgValue(flag: string): string | undefined {
  const index = process.argv.findIndex((arg) => arg === flag);
  return index !== -1 ? process.argv[index + 1] : undefined;
}

function promptForInput(prompt: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function registerAgent(): Promise<void> {
  const baseUrl = getArgValue('--server') || getBaseUrl();
  const presetAnswer = getArgValue('--answer');
  const presetRegistrationId = getArgValue('--registration-id');

  let registrationId: string;

  if (presetRegistrationId) {
    // Resume a previous challenge — skip fetching a new one
    registrationId = presetRegistrationId;
    console.log(chalk.gray(`Resuming registration ${registrationId}...`));
  } else {
    // Step 1: Get challenge
    console.log(chalk.gray(`Requesting challenge from ${baseUrl}...`));

    const challengeRes = await fetch(`${baseUrl}/agents/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!challengeRes.ok) {
      const body = await challengeRes.json().catch(() => ({})) as Record<string, string>;
      console.error(chalk.red(`Error: ${body.error_description || body.error || challengeRes.statusText}`));
      process.exit(1);
    }

    const challenge = await challengeRes.json() as {
      registration_id: string;
      challenge: string;
      instructions: string;
      expires_at: string;
    };

    registrationId = challenge.registration_id;

    // Decode base64 challenge and instructions
    const decodedChallenge = Buffer.from(challenge.challenge, 'base64').toString('utf-8');
    const decodedInstructions = Buffer.from(challenge.instructions, 'base64').toString('utf-8');

    console.log();
    console.log(chalk.bold('Challenge:'));
    console.log('  ' + chalk.yellow(decodedChallenge));
    console.log();
    console.log(chalk.bold('Instructions:'));
    console.log('  ' + decodedInstructions);
    console.log();
    console.log(chalk.gray(`Registration ID: ${registrationId}`));
    console.log(chalk.gray(`Expires at: ${challenge.expires_at}`));
    console.log();
  }

  // Step 2: Get answer
  let answer: string;
  if (presetAnswer) {
    answer = presetAnswer;
    console.log(chalk.gray(`Using provided answer: ${answer}`));
  } else {
    answer = await promptForInput(chalk.bold('Your answer: '));
    if (!answer) {
      console.error(chalk.red('No answer provided.'));
      process.exit(1);
    }
  }

  // Step 3: Verify and create account
  console.log();
  console.log(chalk.gray('Verifying answer and creating account...'));

  const verifyRes = await fetch(`${baseUrl}/agents/register/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      registration_id: registrationId,
      answer,
    }),
  });

  if (!verifyRes.ok) {
    const body = await verifyRes.json().catch(() => ({})) as Record<string, string>;
    console.error(chalk.red(`Error: ${body.error_description || body.error || verifyRes.statusText}`));
    process.exit(1);
  }

  const data = await verifyRes.json() as {
    agentId: string;
    connectionToken: string;
    connectionString: string;
    email: string;
    walletAddress: string;
    fundedAmount: string;
  };

  console.log();
  console.log(chalk.green.bold('Agent self-registered successfully!'));
  console.log();
  console.log('  ' + chalk.bold('Agent ID:') + '          ' + data.agentId);
  console.log('  ' + chalk.bold('Email:') + '             ' + chalk.cyan(data.email));
  console.log('  ' + chalk.bold('Connection Token:') + '  ' + data.connectionToken);
  console.log('  ' + chalk.bold('Wallet:') + '            ' + data.walletAddress);
  console.log('  ' + chalk.bold('Funded:') + '            ' + data.fundedAmount + ' IOU');
  console.log();
  console.log(chalk.bold('Connection String:'));
  console.log('  ' + chalk.cyan(data.connectionString));
  console.log();
  console.log(chalk.bold('Use this to authenticate as the agent:'));
  console.log('  ' + chalk.yellow(`npx atxp login --token "${data.connectionString}"`));
}

async function listAgents(): Promise<void> {
  const { baseUrl, token } = getAccountsAuth();

  const res = await fetch(`${baseUrl}/agents`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.error(chalk.red(`Error: ${(body as Record<string, string>).error || res.statusText}`));
    process.exit(1);
  }

  const data = await res.json() as {
    agents: Array<{
      connectionToken: string;
      atxpAccountId: string;
      email: string | null;
      walletAddress: string | null;
      balance: { totalUsdc: string; totalIou: string } | null;
      createdAt: string | null;
    }>;
  };

  if (data.agents.length === 0) {
    console.log(chalk.gray('No agents created yet.'));
    console.log();
    console.log('Create one with: ' + chalk.cyan('npx atxp agent create'));
    return;
  }

  console.log(chalk.bold(`Your Agents (${data.agents.length})`));
  console.log();

  for (const agent of data.agents) {
    console.log(chalk.gray('─'.repeat(50)));
    console.log('  ' + chalk.bold('Email:') + '             ' + chalk.cyan(agent.email || 'Unknown'));
    console.log('  ' + chalk.bold('Account ID:') + '        ' + agent.atxpAccountId);
    console.log('  ' + chalk.bold('Connection Token:') + '  ' + agent.connectionToken);
    if (agent.walletAddress) {
      console.log('  ' + chalk.bold('Wallet:') + '            ' + agent.walletAddress);
    }
    if (agent.balance) {
      console.log('  ' + chalk.bold('Balance:') + '           ' + `$${agent.balance.totalUsdc} USDC / $${agent.balance.totalIou} IOU`);
    }
    if (agent.createdAt) {
      const date = new Date(agent.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      console.log('  ' + chalk.bold('Created:') + '           ' + chalk.gray(date));
    }
  }
  console.log(chalk.gray('─'.repeat(50)));
}
