import { describe, it, expect } from 'vitest';
import { COMMAND_HELP, PAAS_CATEGORIES, type CommandHelp } from './help.js';

describe('PAAS Help Coverage', () => {
  // Define expected commands per category (source of truth from index.ts switch cases)
  const EXPECTED_COMMANDS: Record<string, string[]> = {
    worker: ['deploy', 'list', 'logs', 'delete'],
    db: ['create', 'list', 'query', 'delete'],
    storage: ['create', 'list', 'upload', 'download', 'files', 'delete-bucket', 'delete-file'],
    dns: ['add', 'list', 'record', 'connect'],
    analytics: ['list', 'schema', 'query', 'events', 'stats'],
    secrets: ['set', 'list', 'delete'],
  };

  // DNS record has nested subcommands
  const EXPECTED_SUBCOMMANDS: Record<string, string[]> = {
    'dns.record': ['create', 'list', 'delete'],
  };

  it('should have all categories defined', () => {
    const categoryNames = PAAS_CATEGORIES.map((c) => c.name);
    for (const category of Object.keys(EXPECTED_COMMANDS)) {
      expect(categoryNames, `Missing category: ${category}`).toContain(category);
    }
  });

  it('should have correct commands listed for each category', () => {
    for (const [categoryName, expectedCommands] of Object.entries(EXPECTED_COMMANDS)) {
      const category = PAAS_CATEGORIES.find((c) => c.name === categoryName);
      expect(category, `Category not found: ${categoryName}`).toBeDefined();
      expect(
        category!.commands.sort(),
        `Category ${categoryName} has wrong commands`
      ).toEqual(expectedCommands.sort());
    }
  });

  it('should have help for all commands', () => {
    for (const [category, commands] of Object.entries(EXPECTED_COMMANDS)) {
      for (const cmd of commands) {
        const key = `${category}.${cmd}`;
        expect(COMMAND_HELP[key], `Missing help for: ${key}`).toBeDefined();
      }
    }
  });

  it('should have help for nested subcommands', () => {
    for (const [parentKey, subCommands] of Object.entries(EXPECTED_SUBCOMMANDS)) {
      for (const subCmd of subCommands) {
        const key = `${parentKey}.${subCmd}`;
        expect(COMMAND_HELP[key], `Missing help for nested command: ${key}`).toBeDefined();
      }
    }
  });

  it('should have required fields in each command help', () => {
    for (const [key, help] of Object.entries(COMMAND_HELP)) {
      expect(help.usage, `${key} missing usage`).toBeDefined();
      expect(help.usage.length, `${key} has empty usage`).toBeGreaterThan(0);
      expect(help.description, `${key} missing description`).toBeDefined();
      expect(help.description.length, `${key} has empty description`).toBeGreaterThan(0);
      expect(help.examples, `${key} missing examples array`).toBeDefined();
      expect(help.examples.length, `${key} should have at least one example`).toBeGreaterThan(0);
    }
  });

  it('should have valid examples in each command help', () => {
    for (const [key, help] of Object.entries(COMMAND_HELP)) {
      for (const example of help.examples) {
        expect(example.command, `${key} has example with missing command`).toBeDefined();
        expect(
          example.command.startsWith('npx atxp paas'),
          `${key} example should start with "npx atxp paas": ${example.command}`
        ).toBe(true);
      }
    }
  });

  it('should have options with flag and description when options are defined', () => {
    for (const [key, help] of Object.entries(COMMAND_HELP)) {
      if (help.options) {
        for (const option of help.options) {
          expect(option.flag, `${key} has option with missing flag`).toBeDefined();
          expect(option.flag.length, `${key} has option with empty flag`).toBeGreaterThan(0);
          expect(option.description, `${key} has option with missing description`).toBeDefined();
          expect(
            option.description.length,
            `${key} has option with empty description`
          ).toBeGreaterThan(0);
        }
      }
    }
  });

  it('should reference existing commands in related field', () => {
    const allKeys = new Set(Object.keys(COMMAND_HELP));

    for (const [key, help] of Object.entries(COMMAND_HELP)) {
      if (help.related) {
        for (const related of help.related) {
          // Convert "worker list" to "worker.list" and "dns record create" to "dns.record.create"
          const relatedKey = related.replaceAll(' ', '.');
          expect(
            allKeys.has(relatedKey),
            `${key} references non-existent related command: ${related} (looked for ${relatedKey})`
          ).toBe(true);
        }
      }
    }
  });
});

describe('PAAS Categories', () => {
  it('should have description for each category', () => {
    for (const category of PAAS_CATEGORIES) {
      expect(category.description, `Category ${category.name} missing description`).toBeDefined();
      expect(
        category.description.length,
        `Category ${category.name} has empty description`
      ).toBeGreaterThan(0);
    }
  });

  it('should have commands array for each category', () => {
    for (const category of PAAS_CATEGORIES) {
      expect(category.commands, `Category ${category.name} missing commands`).toBeDefined();
      expect(
        category.commands.length,
        `Category ${category.name} has no commands`
      ).toBeGreaterThan(0);
    }
  });
});
