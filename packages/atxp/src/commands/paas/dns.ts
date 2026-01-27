import { callTool } from '../../call-tool.js';
import chalk from 'chalk';

const SERVER = 'paas.mcp.atxp.ai';

interface DnsRecordCreateOptions {
  type?: string;
  name?: string;
  content?: string;
  ttl?: number;
  proxied?: boolean;
  priority?: number;
}

interface DnsRecordListOptions {
  type?: string;
}

interface DnsConnectOptions {
  subdomain?: string;
}

export async function dnsAddCommand(domain: string): Promise<void> {
  const result = await callTool(SERVER, 'add_domain', { domain });
  console.log(result);
}

export async function dnsListCommand(): Promise<void> {
  const result = await callTool(SERVER, 'list_domains', {});
  console.log(result);
}

export async function dnsRecordCreateCommand(
  domain: string,
  options: DnsRecordCreateOptions
): Promise<void> {
  if (!options.type) {
    console.error(chalk.red('Error: --type flag is required'));
    console.log(`Usage: ${chalk.cyan('npx atxp paas dns record create <domain> --type A --name www --content <ip>')}`);
    process.exit(1);
  }

  if (!options.name) {
    console.error(chalk.red('Error: --name flag is required'));
    console.log(`Usage: ${chalk.cyan('npx atxp paas dns record create <domain> --type A --name www --content <ip>')}`);
    process.exit(1);
  }

  if (!options.content) {
    console.error(chalk.red('Error: --content flag is required'));
    console.log(`Usage: ${chalk.cyan('npx atxp paas dns record create <domain> --type A --name www --content <ip>')}`);
    process.exit(1);
  }

  const validTypes = ['A', 'AAAA', 'CNAME', 'TXT', 'MX'];
  if (!validTypes.includes(options.type.toUpperCase())) {
    console.error(chalk.red(`Error: Invalid record type. Must be one of: ${validTypes.join(', ')}`));
    process.exit(1);
  }

  const args: Record<string, unknown> = {
    domain,
    type: options.type.toUpperCase(),
    name: options.name,
    content: options.content,
  };

  if (options.ttl !== undefined) {
    args.ttl = options.ttl;
  }
  if (options.proxied !== undefined) {
    args.proxied = options.proxied;
  }
  if (options.priority !== undefined) {
    args.priority = options.priority;
  }

  const result = await callTool(SERVER, 'create_dns_record', args);
  console.log(result);
}

export async function dnsRecordListCommand(
  domain: string,
  options: DnsRecordListOptions
): Promise<void> {
  const args: Record<string, unknown> = { domain };

  if (options.type) {
    args.type = options.type.toUpperCase();
  }

  const result = await callTool(SERVER, 'list_dns_records', args);
  console.log(result);
}

export async function dnsRecordDeleteCommand(
  domain: string,
  recordId: string
): Promise<void> {
  const result = await callTool(SERVER, 'delete_dns_record', {
    domain,
    record_id: recordId,
  });
  console.log(result);
}

export async function dnsConnectCommand(
  domain: string,
  workerName: string,
  options: DnsConnectOptions
): Promise<void> {
  const args: Record<string, unknown> = {
    domain,
    worker_name: workerName,
  };

  if (options.subdomain) {
    args.subdomain = options.subdomain;
  }

  const result = await callTool(SERVER, 'connect_domain_to_worker', args);
  console.log(result);
}
