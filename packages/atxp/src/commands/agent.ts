import chalk from 'chalk';
import { getConnection } from '../config.js';

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

function showAgentHelp(): void {
  console.log(chalk.bold('Agent Commands:'));
  console.log();
  console.log('  ' + chalk.cyan('npx atxp agent create') + '    ' + 'Create a new agent account');
  console.log('  ' + chalk.cyan('npx atxp agent list') + '      ' + 'List your agents');
  console.log();
  console.log(chalk.bold('Details:'));
  console.log('  Each agent gets:');
  console.log('    - A unique email address ({agentId}@atxp.email)');
  console.log('    - An Ethereum wallet');
  console.log('    - 10 IOU tokens to start');
  console.log('    - A connection token for SDK/CLI access');
  console.log();
  console.log(chalk.bold('Examples:'));
  console.log('  npx atxp agent create');
  console.log('  npx atxp agent list');
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
