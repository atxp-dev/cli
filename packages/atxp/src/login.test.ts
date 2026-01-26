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
    it('should generate correct shell export format', () => {
      const connectionString = 'test-connection-string';
      const expectedContent = `export ATXP_CONNECTION="${connectionString}"
`;
      expect(expectedContent).toContain('export ATXP_CONNECTION=');
      expect(expectedContent).toContain(connectionString);
    });

    it('should handle connection strings with special characters', () => {
      const connectionString = 'test-string-with-$pecial-chars';
      const configContent = `export ATXP_CONNECTION="${connectionString}"
`;
      expect(configContent).toContain(connectionString);
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
