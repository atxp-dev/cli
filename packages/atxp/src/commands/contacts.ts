import chalk from 'chalk';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { getConnection } from '../config.js';

export interface ContactsOptions {
  name?: string;
  phone?: string[];
  email?: string[];
  notes?: string;
}

interface Contact {
  id: string;
  name: string;
  phones: string[];
  emails: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface ContactsFile {
  version: number;
  contacts: Contact[];
}

const CONTACTS_DIR = path.join(os.homedir(), '.atxp');
const CONTACTS_FILE = path.join(CONTACTS_DIR, 'contacts.json');

// --- File I/O helpers ---

function loadContacts(): ContactsFile {
  if (!fs.existsSync(CONTACTS_FILE)) {
    return { version: 1, contacts: [] };
  }
  try {
    const raw = fs.readFileSync(CONTACTS_FILE, 'utf-8');
    return JSON.parse(raw) as ContactsFile;
  } catch {
    return { version: 1, contacts: [] };
  }
}

function saveContacts(data: ContactsFile): void {
  fs.mkdirSync(CONTACTS_DIR, { recursive: true });
  fs.writeFileSync(CONTACTS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function generateId(existing: Contact[]): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const ids = new Set(existing.map((c) => c.id));
  for (let attempt = 0; attempt < 100; attempt++) {
    let id = 'c_';
    for (let i = 0; i < 5; i++) {
      id += chars[Math.floor(Math.random() * chars.length)];
    }
    if (!ids.has(id)) return id;
  }
  // Fallback: use timestamp
  return 'c_' + Date.now().toString(36).slice(-5);
}

// --- Auth helper ---

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

// --- Subcommands ---

function addContact(options: ContactsOptions): void {
  if (!options.name) {
    console.error(chalk.red('Error: --name is required'));
    console.log(`Usage: ${chalk.cyan('npx atxp contacts add --name <name> [--phone <num>]... [--email <addr>]... [--notes <text>]')}`);
    process.exit(1);
  }

  const data = loadContacts();
  const now = new Date().toISOString();
  const contact: Contact = {
    id: generateId(data.contacts),
    name: options.name,
    phones: options.phone || [],
    emails: options.email || [],
    notes: options.notes || '',
    createdAt: now,
    updatedAt: now,
  };

  data.contacts.push(contact);
  saveContacts(data);

  console.log(chalk.green('Contact added!'));
  console.log('  ' + chalk.bold('ID:') + '     ' + chalk.cyan(contact.id));
  console.log('  ' + chalk.bold('Name:') + '   ' + contact.name);
  if (contact.phones.length > 0) {
    console.log('  ' + chalk.bold('Phone:') + '  ' + contact.phones.join(', '));
  }
  if (contact.emails.length > 0) {
    console.log('  ' + chalk.bold('Email:') + '  ' + contact.emails.join(', '));
  }
  if (contact.notes) {
    console.log('  ' + chalk.bold('Notes:') + '  ' + contact.notes);
  }
}

function listContacts(): void {
  const data = loadContacts();

  if (data.contacts.length === 0) {
    console.log(chalk.gray('No contacts yet.'));
    console.log('Add one with: ' + chalk.cyan('npx atxp contacts add --name "Name" --phone "+1234"'));
    return;
  }

  console.log(chalk.bold(`${data.contacts.length} contact(s):`));
  console.log();

  for (const c of data.contacts) {
    console.log(chalk.cyan(c.id) + '  ' + chalk.bold(c.name));
    if (c.phones.length > 0) {
      console.log('  ' + chalk.gray('Phone: ' + c.phones.join(', ')));
    }
    if (c.emails.length > 0) {
      console.log('  ' + chalk.gray('Email: ' + c.emails.join(', ')));
    }
  }
}

function showContact(id?: string): void {
  if (!id) {
    console.error(chalk.red('Error: contact ID is required'));
    console.log(`Usage: ${chalk.cyan('npx atxp contacts show <id>')}`);
    process.exit(1);
  }

  const data = loadContacts();
  const contact = data.contacts.find((c) => c.id === id);

  if (!contact) {
    console.error(chalk.red(`Contact not found: ${id}`));
    process.exit(1);
  }

  console.log(chalk.bold('ID:') + '         ' + chalk.cyan(contact.id));
  console.log(chalk.bold('Name:') + '       ' + contact.name);
  console.log(chalk.bold('Phones:') + '     ' + (contact.phones.length > 0 ? contact.phones.join(', ') : chalk.gray('(none)')));
  console.log(chalk.bold('Emails:') + '     ' + (contact.emails.length > 0 ? contact.emails.join(', ') : chalk.gray('(none)')));
  console.log(chalk.bold('Notes:') + '      ' + (contact.notes || chalk.gray('(none)')));
  console.log(chalk.bold('Created:') + '    ' + new Date(contact.createdAt).toLocaleString());
  console.log(chalk.bold('Updated:') + '    ' + new Date(contact.updatedAt).toLocaleString());
}

function editContact(id: string | undefined, options: ContactsOptions): void {
  if (!id) {
    console.error(chalk.red('Error: contact ID is required'));
    console.log(`Usage: ${chalk.cyan('npx atxp contacts edit <id> [--name <name>] [--phone <num>]... [--email <addr>]... [--notes <text>]')}`);
    process.exit(1);
  }

  const data = loadContacts();
  const contact = data.contacts.find((c) => c.id === id);

  if (!contact) {
    console.error(chalk.red(`Contact not found: ${id}`));
    process.exit(1);
  }

  let changed = false;

  if (options.name) {
    contact.name = options.name;
    changed = true;
  }
  if (options.phone && options.phone.length > 0) {
    contact.phones = options.phone;
    changed = true;
  }
  if (options.email && options.email.length > 0) {
    contact.emails = options.email;
    changed = true;
  }
  if (options.notes !== undefined && options.notes !== '') {
    contact.notes = options.notes;
    changed = true;
  }

  if (!changed) {
    console.log(chalk.yellow('No fields to update. Provide at least one of --name, --phone, --email, or --notes.'));
    return;
  }

  contact.updatedAt = new Date().toISOString();
  saveContacts(data);

  console.log(chalk.green('Contact updated!'));
  console.log('  ' + chalk.bold('ID:') + '     ' + chalk.cyan(contact.id));
  console.log('  ' + chalk.bold('Name:') + '   ' + contact.name);
  if (contact.phones.length > 0) {
    console.log('  ' + chalk.bold('Phone:') + '  ' + contact.phones.join(', '));
  }
  if (contact.emails.length > 0) {
    console.log('  ' + chalk.bold('Email:') + '  ' + contact.emails.join(', '));
  }
  if (contact.notes) {
    console.log('  ' + chalk.bold('Notes:') + '  ' + contact.notes);
  }
}

function removeContact(id?: string): void {
  if (!id) {
    console.error(chalk.red('Error: contact ID is required'));
    console.log(`Usage: ${chalk.cyan('npx atxp contacts remove <id>')}`);
    process.exit(1);
  }

  const data = loadContacts();
  const index = data.contacts.findIndex((c) => c.id === id);

  if (index === -1) {
    console.error(chalk.red(`Contact not found: ${id}`));
    process.exit(1);
  }

  const removed = data.contacts.splice(index, 1)[0];
  saveContacts(data);

  console.log(chalk.green('Contact removed: ') + chalk.bold(removed.name) + chalk.gray(` (${removed.id})`));
}

function searchContacts(query?: string): void {
  if (!query) {
    console.error(chalk.red('Error: search query is required'));
    console.log(`Usage: ${chalk.cyan('npx atxp contacts search <query>')}`);
    process.exit(1);
  }

  const data = loadContacts();
  const q = query.toLowerCase();

  const matches = data.contacts.filter((c) => {
    if (c.name.toLowerCase().includes(q)) return true;
    if (c.notes.toLowerCase().includes(q)) return true;
    if (c.phones.some((p) => p.includes(q))) return true;
    if (c.emails.some((e) => e.toLowerCase().includes(q))) return true;
    return false;
  });

  if (matches.length === 0) {
    console.log(chalk.gray(`No contacts matching "${query}"`));
    return;
  }

  console.log(chalk.bold(`${matches.length} result(s) for "${query}":`));
  console.log();

  for (const c of matches) {
    console.log(chalk.cyan(c.id) + '  ' + chalk.bold(c.name));
    if (c.phones.length > 0) {
      console.log('  ' + chalk.gray('Phone: ' + c.phones.join(', ')));
    }
    if (c.emails.length > 0) {
      console.log('  ' + chalk.gray('Email: ' + c.emails.join(', ')));
    }
    if (c.notes) {
      console.log('  ' + chalk.gray('Notes: ' + c.notes));
    }
  }
}

async function pushContacts(): Promise<void> {
  const { baseUrl, token } = getAccountsAuth();

  if (!fs.existsSync(CONTACTS_FILE)) {
    console.log(chalk.yellow('No contacts file found. Add contacts first with:'));
    console.log(chalk.cyan('  npx atxp contacts add --name "Name"'));
    return;
  }

  const raw = fs.readFileSync(CONTACTS_FILE, 'utf-8');

  console.log(chalk.gray('Pushing contacts to server...'));

  const res = await fetch(`${baseUrl}/backup/contacts`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: raw,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.error(chalk.red(`Error: ${(body as Record<string, string>).error || res.statusText}`));
    process.exit(1);
  }

  const data = loadContacts();
  console.log(chalk.green.bold('Contacts pushed successfully!'));
  console.log('  ' + chalk.bold('Contacts:') + ' ' + data.contacts.length);
}

async function pullContacts(): Promise<void> {
  const { baseUrl, token } = getAccountsAuth();

  console.log(chalk.gray('Pulling contacts from server...'));

  const res = await fetch(`${baseUrl}/backup/contacts`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.error(chalk.red(`Error: ${(body as Record<string, string>).error || res.statusText}`));
    process.exit(1);
  }

  const raw = await res.text();

  if (!raw || raw === '{}' || raw === 'null') {
    console.log(chalk.yellow('No contacts backup found on server. Push one first with:'));
    console.log(chalk.cyan('  npx atxp contacts push'));
    return;
  }

  // Validate JSON
  let parsed: ContactsFile;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error(chalk.red('Error: Invalid contacts data from server'));
    process.exit(1);
  }

  fs.mkdirSync(CONTACTS_DIR, { recursive: true });
  fs.writeFileSync(CONTACTS_FILE, JSON.stringify(parsed, null, 2), 'utf-8');

  console.log(chalk.green.bold('Contacts pulled successfully!'));
  console.log('  ' + chalk.bold('Contacts:') + ' ' + (parsed.contacts?.length || 0));
  console.log('  ' + chalk.bold('File:') + '     ' + CONTACTS_FILE);
}

// --- Help ---

function showContactsHelp(): void {
  console.log(chalk.bold('Contacts Commands:'));
  console.log();
  console.log(chalk.bold.underline('Local Operations'));
  console.log('  ' + chalk.cyan('npx atxp contacts add') + ' ' + chalk.yellow('--name <name> [--phone <num>]... [--email <addr>]... [--notes <text>]'));
  console.log('  ' + chalk.cyan('npx atxp contacts list') + '                    ' + 'List all contacts');
  console.log('  ' + chalk.cyan('npx atxp contacts show') + ' ' + chalk.yellow('<id>') + '              ' + 'Show full contact details');
  console.log('  ' + chalk.cyan('npx atxp contacts edit') + ' ' + chalk.yellow('<id> [options]') + '    ' + 'Update contact fields');
  console.log('  ' + chalk.cyan('npx atxp contacts remove') + ' ' + chalk.yellow('<id>') + '            ' + 'Delete a contact');
  console.log('  ' + chalk.cyan('npx atxp contacts search') + ' ' + chalk.yellow('<query>') + '         ' + 'Search contacts');
  console.log();
  console.log(chalk.bold.underline('Cloud Sync'));
  console.log('  ' + chalk.cyan('npx atxp contacts push') + '                    ' + 'Back up contacts to server');
  console.log('  ' + chalk.cyan('npx atxp contacts pull') + '                    ' + 'Restore contacts from server');
  console.log();
  console.log(chalk.bold('Options:'));
  console.log('  ' + chalk.yellow('--name') + '    ' + 'Contact name (required for add)');
  console.log('  ' + chalk.yellow('--phone') + '   ' + 'Phone number (repeatable)');
  console.log('  ' + chalk.yellow('--email') + '   ' + 'Email address (repeatable)');
  console.log('  ' + chalk.yellow('--notes') + '   ' + 'Free-text notes');
  console.log();
  console.log(chalk.bold('Details:'));
  console.log('  Contacts are stored locally in ~/.atxp/contacts.json.');
  console.log('  All local operations (add, list, show, edit, remove, search) are free and work offline.');
  console.log('  push/pull sync the contacts file to/from ATXP servers (requires login).');
  console.log('  When editing, array fields (--phone, --email) replace existing values.');
  console.log();
  console.log(chalk.bold('Examples:'));
  console.log('  npx atxp contacts add --name "Kenny" --phone "+14155551234" --email "kenny@example.com"');
  console.log('  npx atxp contacts list');
  console.log('  npx atxp contacts show c_a7f3x');
  console.log('  npx atxp contacts edit c_a7f3x --phone "+14155559999"');
  console.log('  npx atxp contacts remove c_a7f3x');
  console.log('  npx atxp contacts search "Kenny"');
  console.log('  npx atxp contacts push');
  console.log('  npx atxp contacts pull');
}

// --- Main command router ---

export async function contactsCommand(subCommand: string, options: ContactsOptions, positionalArg?: string): Promise<void> {
  if (!subCommand || subCommand === 'help' || subCommand === '--help' || subCommand === '-h') {
    showContactsHelp();
    return;
  }

  switch (subCommand) {
    case 'add':
      addContact(options);
      break;

    case 'list':
      listContacts();
      break;

    case 'show':
      showContact(positionalArg);
      break;

    case 'edit':
      editContact(positionalArg, options);
      break;

    case 'remove':
      removeContact(positionalArg);
      break;

    case 'search':
      searchContacts(positionalArg);
      break;

    case 'push':
      await pushContacts();
      break;

    case 'pull':
      await pullContacts();
      break;

    default:
      console.error(chalk.red(`Unknown contacts command: ${subCommand}`));
      console.log();
      showContactsHelp();
      process.exit(1);
  }
}
