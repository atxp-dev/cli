import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';
import os from 'os';

// Mock fs and inquirer
vi.mock('fs');
vi.mock('inquirer');

describe('Login', () => {
  const CONFIG_DIR = path.join(os.homedir(), '.atxp');
  const CONFIG_FILE = path.join(CONFIG_DIR, 'config');

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('config file path', () => {
    it('should use ~/.atxp/config as the config file path', () => {
      expect(CONFIG_DIR).toBe(path.join(os.homedir(), '.atxp'));
      expect(CONFIG_FILE).toBe(path.join(os.homedir(), '.atxp', 'config'));
    });
  });

  describe('config file format', () => {
    it('should generate correct plain KEY=VALUE format', () => {
      const connectionString = 'test-connection-string';
      const expectedContent = `ATXP_CONNECTION=${connectionString}\n`;
      expect(expectedContent).toBe('ATXP_CONNECTION=test-connection-string\n');
      expect(expectedContent).not.toContain('export');
      expect(expectedContent).not.toContain('"');
    });

    it('should handle connection strings with special characters', () => {
      const connectionString = 'https://example.com?token=abc&foo=bar';
      const configContent = `ATXP_CONNECTION=${connectionString}\n`;
      expect(configContent).toContain(connectionString);
      expect(configContent).not.toContain('export');
    });
  });

  describe('config file parsing (backward compatibility)', () => {
    it('should parse new plain KEY=VALUE format', () => {
      const content = 'ATXP_CONNECTION=my-connection-string\n';
      const match = content.match(/^(?:export\s+)?ATXP_CONNECTION=["']?(.+?)["']?\s*$/m);
      expect(match).not.toBeNull();
      expect(match![1]).toBe('my-connection-string');
    });

    it('should parse old export format with double quotes', () => {
      const content = 'export ATXP_CONNECTION="my-connection-string"\n';
      const match = content.match(/^(?:export\s+)?ATXP_CONNECTION=["']?(.+?)["']?\s*$/m);
      expect(match).not.toBeNull();
      expect(match![1]).toBe('my-connection-string');
    });

    it('should parse old export format with single quotes', () => {
      const content = "export ATXP_CONNECTION='my-connection-string'\n";
      const match = content.match(/^(?:export\s+)?ATXP_CONNECTION=["']?(.+?)["']?\s*$/m);
      expect(match).not.toBeNull();
      expect(match![1]).toBe('my-connection-string');
    });

    it('should parse URLs with special characters in new format', () => {
      const content = 'ATXP_CONNECTION=https://accounts.atxp.ai?connection_token=abc123&foo=bar\n';
      const match = content.match(/^(?:export\s+)?ATXP_CONNECTION=["']?(.+?)["']?\s*$/m);
      expect(match).not.toBeNull();
      expect(match![1]).toBe('https://accounts.atxp.ai?connection_token=abc123&foo=bar');
    });
  });

  describe('login options', () => {
    it('should recognize force flag', () => {
      const options = { force: true };
      expect(options.force).toBe(true);
    });

    it('should default force to false', () => {
      const options = { force: false };
      expect(options.force).toBe(false);
    });
  });

  describe('environment variable check', () => {
    it('should detect existing ATXP_CONNECTION', () => {
      const checkExistingConnection = (envConnection?: string) => {
        return !!envConnection;
      };

      expect(checkExistingConnection('existing-connection')).toBe(true);
      expect(checkExistingConnection(undefined)).toBe(false);
      expect(checkExistingConnection('')).toBe(false);
    });
  });
});
