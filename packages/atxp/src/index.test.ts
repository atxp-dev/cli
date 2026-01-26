import { describe, it, expect } from 'vitest';

describe('ATXP CLI', () => {
  describe('create mode detection', () => {
    it('should detect create mode from command', () => {
      const testCreateMode = (npmConfigArgv?: string, argv: string[] = []) => {
        return (
          npmConfigArgv?.includes('create') ||
          argv.includes('--create') ||
          argv[2] === 'create'
        );
      };

      expect(testCreateMode('create')).toBe(true);
      expect(testCreateMode(undefined, ['node', 'script', 'create'])).toBe(true);
      expect(testCreateMode(undefined, ['node', 'script', '--create'])).toBe(true);
      expect(testCreateMode()).toBe(false);
    });
  });

  describe('argument parsing logic', () => {
    it('should parse app name from create command', () => {
      const parseAppName = (argv: string[]) => {
        const command = argv[2];
        if (command === 'create') {
          return argv[3]; // npx atxp create <app-name>
        }
        return undefined;
      };

      expect(parseAppName(['node', 'script', 'create', 'my-app'])).toBe('my-app');
      expect(parseAppName(['node', 'script', 'create'])).toBe(undefined);
      expect(parseAppName(['node', 'script', 'demo'])).toBe(undefined);
    });

    it('should parse app name from dev create command', () => {
      const parseAppName = (argv: string[]) => {
        const command = argv[2];
        const subCommand = argv[3];
        if (command === 'dev' && subCommand === 'create') {
          return argv[4]; // npx atxp dev create <app-name>
        } else if (command === 'create') {
          return argv[3]; // npx atxp create <app-name> (legacy)
        }
        return undefined;
      };

      expect(parseAppName(['node', 'script', 'dev', 'create', 'my-app'])).toBe('my-app');
      expect(parseAppName(['node', 'script', 'dev', 'create'])).toBe(undefined);
      expect(parseAppName(['node', 'script', 'create', 'my-app'])).toBe('my-app');
    });

    it('should parse framework flag', () => {
      const parseFramework = (argv: string[]) => {
        const frameworkIndex = argv.findIndex((arg) => arg === '--framework' || arg === '-f');
        return frameworkIndex !== -1 ? argv[frameworkIndex + 1] : undefined;
      };

      expect(
        parseFramework(['node', 'script', 'create', 'my-app', '--framework', 'express'])
      ).toBe('express');
      expect(parseFramework(['node', 'script', 'create', 'my-app', '-f', 'express'])).toBe(
        'express'
      );
      expect(parseFramework(['node', 'script', 'create', 'my-app'])).toBe(undefined);
    });

    it('should parse git flags', () => {
      const parseGitOption = (argv: string[]) => {
        if (argv.includes('--git')) return 'git';
        if (argv.includes('--no-git')) return 'no-git';
        return undefined;
      };

      expect(parseGitOption(['node', 'script', 'create', 'my-app', '--git'])).toBe('git');
      expect(parseGitOption(['node', 'script', 'create', 'my-app', '--no-git'])).toBe('no-git');
      expect(parseGitOption(['node', 'script', 'create', 'my-app'])).toBe(undefined);
    });

    it('should detect help flags', () => {
      const hasHelpFlag = (argv: string[]) => {
        return argv.includes('--help') || argv.includes('-h');
      };

      expect(hasHelpFlag(['node', 'script', 'create', '--help'])).toBe(true);
      expect(hasHelpFlag(['node', 'script', 'create', 'my-app', '-h'])).toBe(true);
      expect(hasHelpFlag(['node', 'script', '--help'])).toBe(true);
      expect(hasHelpFlag(['node', 'script', 'create', 'my-app'])).toBe(false);
    });

    it('should parse force flag for login', () => {
      const hasForceFlag = (argv: string[]) => {
        return argv.includes('--force');
      };

      expect(hasForceFlag(['node', 'script', 'login', '--force'])).toBe(true);
      expect(hasForceFlag(['node', 'script', 'login'])).toBe(false);
    });
  });

  describe('command routing', () => {
    it('should identify tool commands', () => {
      const toolCommands = ['search', 'image', 'music', 'video', 'x'];

      const isToolCommand = (command: string) => {
        return toolCommands.includes(command);
      };

      expect(isToolCommand('search')).toBe(true);
      expect(isToolCommand('image')).toBe(true);
      expect(isToolCommand('music')).toBe(true);
      expect(isToolCommand('video')).toBe(true);
      expect(isToolCommand('x')).toBe(true);
      expect(isToolCommand('demo')).toBe(false);
      expect(isToolCommand('login')).toBe(false);
    });

    it('should identify dev subcommands', () => {
      const devSubcommands = ['demo', 'create'];

      const isDevSubcommand = (subCommand: string) => {
        return devSubcommands.includes(subCommand);
      };

      expect(isDevSubcommand('demo')).toBe(true);
      expect(isDevSubcommand('create')).toBe(true);
      expect(isDevSubcommand('search')).toBe(false);
    });

    it('should parse tool arguments', () => {
      const parseToolArgs = (argv: string[]) => {
        // Get everything after the command, filtering out flags
        return argv
          .slice(3)
          .filter((arg) => !arg.startsWith('-'))
          .join(' ');
      };

      expect(parseToolArgs(['node', 'script', 'search', 'hello', 'world'])).toBe('hello world');
      expect(parseToolArgs(['node', 'script', 'image', 'a', 'sunset'])).toBe('a sunset');
      expect(parseToolArgs(['node', 'script', 'x', 'trending'])).toBe('trending');
      expect(parseToolArgs(['node', 'script', 'search'])).toBe('');
    });
  });
});
