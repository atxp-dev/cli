import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the call-tool module
vi.mock('../../call-tool.js', () => ({
  callTool: vi.fn(),
}));

import { callTool } from '../../call-tool.js';
import {
  secretsSetCommand,
  secretsListCommand,
  secretsDeleteCommand,
  isValidSecretKey,
  parseKeyValue,
} from './secrets.js';

describe('parseKeyValue', () => {
  it('should parse valid KEY=VALUE format', () => {
    const result = parseKeyValue('API_KEY=sk-123456');
    expect(result).toEqual({ key: 'API_KEY', value: 'sk-123456' });
  });

  it('should handle empty value', () => {
    const result = parseKeyValue('EMPTY_KEY=');
    expect(result).toEqual({ key: 'EMPTY_KEY', value: '' });
  });

  it('should handle value with equals sign', () => {
    const result = parseKeyValue('CONNECTION=host=localhost;port=5432');
    expect(result).toEqual({ key: 'CONNECTION', value: 'host=localhost;port=5432' });
  });

  it('should handle value with special characters', () => {
    const result = parseKeyValue('SECRET=abc!@#$%^&*()');
    expect(result).toEqual({ key: 'SECRET', value: 'abc!@#$%^&*()' });
  });

  it('should handle value with spaces', () => {
    const result = parseKeyValue('MESSAGE=hello world');
    expect(result).toEqual({ key: 'MESSAGE', value: 'hello world' });
  });

  it('should return null when no equals sign', () => {
    const result = parseKeyValue('NO_EQUALS_SIGN');
    expect(result).toBeNull();
  });

  it('should return null for empty string', () => {
    const result = parseKeyValue('');
    expect(result).toBeNull();
  });

  it('should handle key starting with equals', () => {
    const result = parseKeyValue('=value');
    expect(result).toEqual({ key: '', value: 'value' });
  });

  it('should handle long values', () => {
    const longValue = 'a'.repeat(1000);
    const result = parseKeyValue(`LONG_KEY=${longValue}`);
    expect(result).toEqual({ key: 'LONG_KEY', value: longValue });
  });
});

describe('isValidSecretKey', () => {
  describe('valid keys', () => {
    it('should accept simple uppercase key', () => {
      expect(isValidSecretKey('API_KEY')).toBe(true);
    });

    it('should accept key with numbers', () => {
      expect(isValidSecretKey('API_KEY_V2')).toBe(true);
    });

    it('should accept single character key', () => {
      expect(isValidSecretKey('A')).toBe(true);
    });

    it('should accept key with trailing numbers', () => {
      expect(isValidSecretKey('SECRET123')).toBe(true);
    });

    it('should accept key with multiple underscores', () => {
      expect(isValidSecretKey('MY_SUPER_SECRET_KEY')).toBe(true);
    });

    it('should accept key starting with underscore followed by uppercase', () => {
      // Note: based on the regex /^[A-Z][A-Z0-9_]*$/, this should be invalid
      // since it requires starting with uppercase letter
      expect(isValidSecretKey('_PRIVATE')).toBe(false);
    });
  });

  describe('invalid keys', () => {
    it('should reject lowercase key', () => {
      expect(isValidSecretKey('api_key')).toBe(false);
    });

    it('should reject mixed case key', () => {
      expect(isValidSecretKey('Api_Key')).toBe(false);
    });

    it('should reject key starting with number', () => {
      expect(isValidSecretKey('123_KEY')).toBe(false);
    });

    it('should reject key with hyphen', () => {
      expect(isValidSecretKey('API-KEY')).toBe(false);
    });

    it('should reject key with spaces', () => {
      expect(isValidSecretKey('API KEY')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isValidSecretKey('')).toBe(false);
    });

    it('should reject key with special characters', () => {
      expect(isValidSecretKey('API@KEY')).toBe(false);
    });

    it('should reject key starting with underscore', () => {
      expect(isValidSecretKey('_API_KEY')).toBe(false);
    });

    it('should reject key with lowercase letters', () => {
      expect(isValidSecretKey('APIkey')).toBe(false);
    });
  });
});

describe('Secrets Commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
  });

  describe('secretsSetCommand', () => {
    it('should set a secret with valid key and value', async () => {
      vi.mocked(callTool).mockResolvedValue('{"success": true}');

      await secretsSetCommand('my-worker', 'API_KEY=sk-123456');

      expect(callTool).toHaveBeenCalledWith('paas.mcp.atxp.ai', 'set_secret', {
        worker_name: 'my-worker',
        key: 'API_KEY',
        value: 'sk-123456',
      });
    });

    it('should set a secret with value containing equals sign', async () => {
      vi.mocked(callTool).mockResolvedValue('{"success": true}');

      await secretsSetCommand('my-worker', 'DATABASE_URL=postgres://user:pass@host/db?ssl=true');

      expect(callTool).toHaveBeenCalledWith('paas.mcp.atxp.ai', 'set_secret', {
        worker_name: 'my-worker',
        key: 'DATABASE_URL',
        value: 'postgres://user:pass@host/db?ssl=true',
      });
    });

    it('should exit with error for invalid format (no equals)', async () => {
      await expect(secretsSetCommand('my-worker', 'INVALID_FORMAT')).rejects.toThrow(
        'process.exit called'
      );
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Invalid format')
      );
    });

    it('should exit with error for invalid key (lowercase)', async () => {
      await expect(secretsSetCommand('my-worker', 'api_key=value')).rejects.toThrow(
        'process.exit called'
      );
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('UPPER_SNAKE_CASE')
      );
    });

    it('should exit with error for invalid key (starts with number)', async () => {
      await expect(secretsSetCommand('my-worker', '123KEY=value')).rejects.toThrow(
        'process.exit called'
      );
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('UPPER_SNAKE_CASE')
      );
    });

    it('should exit with error for invalid key (contains hyphen)', async () => {
      await expect(secretsSetCommand('my-worker', 'API-KEY=value')).rejects.toThrow(
        'process.exit called'
      );
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('UPPER_SNAKE_CASE')
      );
    });

    it('should exit with error for empty value', async () => {
      await expect(secretsSetCommand('my-worker', 'API_KEY=')).rejects.toThrow(
        'process.exit called'
      );
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('cannot be empty')
      );
    });

    it('should log success result', async () => {
      const mockResult = '{"success": true, "name": "API_KEY"}';
      vi.mocked(callTool).mockResolvedValue(mockResult);

      await secretsSetCommand('my-worker', 'API_KEY=sk-123');

      expect(console.log).toHaveBeenCalledWith(mockResult);
    });
  });

  describe('secretsListCommand', () => {
    it('should list secrets for a worker', async () => {
      vi.mocked(callTool).mockResolvedValue('{"success": true, "secrets": []}');

      await secretsListCommand('my-worker');

      expect(callTool).toHaveBeenCalledWith('paas.mcp.atxp.ai', 'list_secrets', {
        worker_name: 'my-worker',
      });
    });

    it('should log result', async () => {
      const mockResult = '{"success": true, "secrets": [{"name": "API_KEY"}]}';
      vi.mocked(callTool).mockResolvedValue(mockResult);

      await secretsListCommand('my-worker');

      expect(console.log).toHaveBeenCalledWith(mockResult);
    });
  });

  describe('secretsDeleteCommand', () => {
    it('should delete a secret with valid key', async () => {
      vi.mocked(callTool).mockResolvedValue('{"success": true}');

      await secretsDeleteCommand('my-worker', 'API_KEY');

      expect(callTool).toHaveBeenCalledWith('paas.mcp.atxp.ai', 'delete_secret', {
        worker_name: 'my-worker',
        key: 'API_KEY',
      });
    });

    it('should exit with error for invalid key (lowercase)', async () => {
      await expect(secretsDeleteCommand('my-worker', 'api_key')).rejects.toThrow(
        'process.exit called'
      );
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('UPPER_SNAKE_CASE')
      );
    });

    it('should exit with error for invalid key (starts with number)', async () => {
      await expect(secretsDeleteCommand('my-worker', '123KEY')).rejects.toThrow(
        'process.exit called'
      );
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('UPPER_SNAKE_CASE')
      );
    });

    it('should exit with error for invalid key (contains hyphen)', async () => {
      await expect(secretsDeleteCommand('my-worker', 'API-KEY')).rejects.toThrow(
        'process.exit called'
      );
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('UPPER_SNAKE_CASE')
      );
    });

    it('should log success result', async () => {
      const mockResult = '{"success": true}';
      vi.mocked(callTool).mockResolvedValue(mockResult);

      await secretsDeleteCommand('my-worker', 'API_KEY');

      expect(console.log).toHaveBeenCalledWith(mockResult);
    });
  });
});
