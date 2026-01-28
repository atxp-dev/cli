import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';

// Mock the call-tool module
vi.mock('../../call-tool.js', () => ({
  callTool: vi.fn(),
}));

// Mock fs
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  },
}));

import { callTool } from '../../call-tool.js';
import {
  workerDeployCommand,
  workerListCommand,
  workerLogsCommand,
  workerDeleteCommand,
  workerInfoCommand,
  parseEnvArg,
  parseEnvFile,
  validateEnvVarName,
  BASE_RESERVED_ENV_NAMES,
  getReservedEnvNames,
  SENSITIVE_PATTERNS,
} from './worker.js';

describe('parseEnvArg', () => {
  it('should parse valid KEY=VALUE format', () => {
    const result = parseEnvArg('MY_VAR=my_value');
    expect(result).toEqual({ key: 'MY_VAR', value: 'my_value' });
  });

  it('should handle empty value', () => {
    const result = parseEnvArg('MY_VAR=');
    expect(result).toEqual({ key: 'MY_VAR', value: '' });
  });

  it('should handle value with equals sign', () => {
    const result = parseEnvArg('MY_VAR=value=with=equals');
    expect(result).toEqual({ key: 'MY_VAR', value: 'value=with=equals' });
  });

  it('should handle value with special characters', () => {
    const result = parseEnvArg('MY_VAR=hello world!@#$%');
    expect(result).toEqual({ key: 'MY_VAR', value: 'hello world!@#$%' });
  });

  it('should return null when no equals sign', () => {
    const result = parseEnvArg('MY_VAR_NO_VALUE');
    expect(result).toBeNull();
  });

  it('should return null for empty string', () => {
    const result = parseEnvArg('');
    expect(result).toBeNull();
  });

  it('should handle key starting with equals', () => {
    const result = parseEnvArg('=value');
    expect(result).toEqual({ key: '', value: 'value' });
  });

  it('should handle URL as value', () => {
    const result = parseEnvArg('DATABASE_URL=postgres://user:pass@host:5432/db');
    expect(result).toEqual({ key: 'DATABASE_URL', value: 'postgres://user:pass@host:5432/db' });
  });
});

describe('parseEnvFile', () => {
  it('should parse simple KEY=VALUE lines', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue('FOO=bar\nBAZ=qux');

    const result = parseEnvFile('./test.env');

    expect(result).toEqual({ FOO: 'bar', BAZ: 'qux' });
  });

  it('should skip comment lines', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue('# This is a comment\nFOO=bar\n# Another comment\nBAZ=qux');

    const result = parseEnvFile('./test.env');

    expect(result).toEqual({ FOO: 'bar', BAZ: 'qux' });
  });

  it('should skip empty lines', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue('FOO=bar\n\n\nBAZ=qux\n');

    const result = parseEnvFile('./test.env');

    expect(result).toEqual({ FOO: 'bar', BAZ: 'qux' });
  });

  it('should handle double-quoted values', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue('FOO="bar with spaces"\nBAZ="value"');

    const result = parseEnvFile('./test.env');

    expect(result).toEqual({ FOO: 'bar with spaces', BAZ: 'value' });
  });

  it('should handle single-quoted values', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue("FOO='bar with spaces'\nBAZ='value'");

    const result = parseEnvFile('./test.env');

    expect(result).toEqual({ FOO: 'bar with spaces', BAZ: 'value' });
  });

  it('should handle values with equals signs', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue('CONNECTION=host=localhost;port=5432');

    const result = parseEnvFile('./test.env');

    expect(result).toEqual({ CONNECTION: 'host=localhost;port=5432' });
  });

  it('should skip lines without equals sign', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue('FOO=bar\nINVALID_LINE\nBAZ=qux');

    const result = parseEnvFile('./test.env');

    expect(result).toEqual({ FOO: 'bar', BAZ: 'qux' });
  });

  it('should trim whitespace around keys and values', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue('  FOO  =  bar  \n  BAZ  =  qux  ');

    const result = parseEnvFile('./test.env');

    expect(result).toEqual({ FOO: 'bar', BAZ: 'qux' });
  });

  it('should throw error when file does not exist', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    expect(() => parseEnvFile('./nonexistent.env')).toThrow('Env file not found');
  });

  it('should handle empty file', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue('');

    const result = parseEnvFile('./empty.env');

    expect(result).toEqual({});
  });

  it('should handle file with only comments', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue('# comment 1\n# comment 2');

    const result = parseEnvFile('./comments.env');

    expect(result).toEqual({});
  });

  it('should handle empty values', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue('EMPTY=\nANOTHER=""');

    const result = parseEnvFile('./test.env');

    expect(result).toEqual({ EMPTY: '', ANOTHER: '' });
  });
});

describe('validateEnvVarName', () => {
  const reservedNames = BASE_RESERVED_ENV_NAMES;

  describe('valid identifier tests', () => {
    it('should accept valid alphanumeric name', () => {
      const result = validateEnvVarName('MY_VAR', reservedNames);
      expect(result).toEqual({ valid: true });
    });

    it('should accept name starting with letter', () => {
      const result = validateEnvVarName('A', reservedNames);
      expect(result).toEqual({ valid: true });
    });

    it('should accept name starting with underscore', () => {
      const result = validateEnvVarName('_PRIVATE_VAR', reservedNames);
      expect(result).toEqual({ valid: true });
    });

    it('should accept name with numbers', () => {
      const result = validateEnvVarName('VAR_123', reservedNames);
      expect(result).toEqual({ valid: true });
    });

    it('should accept lowercase name', () => {
      const result = validateEnvVarName('my_var', reservedNames);
      expect(result).toEqual({ valid: true });
    });

    it('should accept mixed case name', () => {
      const result = validateEnvVarName('MyVar_Test', reservedNames);
      expect(result).toEqual({ valid: true });
    });
  });

  describe('invalid identifier tests', () => {
    it('should reject name starting with number', () => {
      const result = validateEnvVarName('123VAR', reservedNames);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be a valid identifier');
    });

    it('should reject name with hyphen', () => {
      const result = validateEnvVarName('MY-VAR', reservedNames);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be a valid identifier');
    });

    it('should reject name with spaces', () => {
      const result = validateEnvVarName('MY VAR', reservedNames);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be a valid identifier');
    });

    it('should reject name with special characters', () => {
      const result = validateEnvVarName('MY@VAR', reservedNames);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be a valid identifier');
    });

    it('should reject empty string', () => {
      const result = validateEnvVarName('', reservedNames);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be a valid identifier');
    });
  });

  describe('reserved name tests', () => {
    it('should reject DB as reserved name', () => {
      const result = validateEnvVarName('DB', reservedNames);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Reserved env var name');
      expect(result.error).toContain('conflicts with existing bindings');
    });

    it('should reject BUCKET as reserved name', () => {
      const result = validateEnvVarName('BUCKET', reservedNames);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Reserved env var name');
    });

    it('should reject USER_NAMESPACE as reserved name', () => {
      const result = validateEnvVarName('USER_NAMESPACE', reservedNames);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Reserved env var name');
    });

    it('should reject lowercase reserved name (case-insensitive)', () => {
      const result = validateEnvVarName('db', reservedNames);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Reserved env var name');
    });
  });
});

describe('getReservedEnvNames', () => {
  it('should return base reserved names plus ANALYTICS by default', () => {
    const result = getReservedEnvNames();
    expect(result).toEqual(['DB', 'BUCKET', 'USER_NAMESPACE', 'ANALYTICS']);
  });

  it('should return base reserved names plus custom binding name', () => {
    const result = getReservedEnvNames('MY_STATS');
    expect(result).toEqual(['DB', 'BUCKET', 'USER_NAMESPACE', 'MY_STATS']);
  });

  it('should uppercase the custom binding name', () => {
    const result = getReservedEnvNames('my_stats');
    expect(result).toEqual(['DB', 'BUCKET', 'USER_NAMESPACE', 'MY_STATS']);
  });
});

describe('SENSITIVE_PATTERNS', () => {
  it('should detect SECRET in variable name', () => {
    const hasSensitive = SENSITIVE_PATTERNS.some(p => p.test('MY_SECRET'));
    expect(hasSensitive).toBe(true);
  });

  it('should detect PASSWORD in variable name', () => {
    const hasSensitive = SENSITIVE_PATTERNS.some(p => p.test('DB_PASSWORD'));
    expect(hasSensitive).toBe(true);
  });

  it('should detect KEY in variable name', () => {
    const hasSensitive = SENSITIVE_PATTERNS.some(p => p.test('API_KEY'));
    expect(hasSensitive).toBe(true);
  });

  it('should detect TOKEN in variable name', () => {
    const hasSensitive = SENSITIVE_PATTERNS.some(p => p.test('AUTH_TOKEN'));
    expect(hasSensitive).toBe(true);
  });

  it('should detect CREDENTIAL in variable name', () => {
    const hasSensitive = SENSITIVE_PATTERNS.some(p => p.test('AWS_CREDENTIAL'));
    expect(hasSensitive).toBe(true);
  });

  it('should be case insensitive', () => {
    const hasSensitive = SENSITIVE_PATTERNS.some(p => p.test('api_key'));
    expect(hasSensitive).toBe(true);
  });

  it('should not match non-sensitive variable names', () => {
    const hasSensitive = SENSITIVE_PATTERNS.some(p => p.test('DATABASE_URL'));
    expect(hasSensitive).toBe(false);
  });
});

describe('Worker Commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
  });

  describe('workerDeployCommand', () => {
    it('should deploy a worker with code from file', async () => {
      const mockCode = 'export default { fetch() { return new Response("Hello"); } }';
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(mockCode);
      vi.mocked(callTool).mockResolvedValue('{"success": true}');

      await workerDeployCommand('my-worker', { code: './worker.js' });

      expect(callTool).toHaveBeenCalledWith('paas.mcp.atxp.ai', 'deploy_worker', {
        name: 'my-worker',
        code: mockCode,
      });
    });

    it('should include database bindings when provided', async () => {
      const mockCode = 'export default { fetch() { return new Response("Hello"); } }';
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(mockCode);
      vi.mocked(callTool).mockResolvedValue('{"success": true}');

      await workerDeployCommand('my-worker', {
        code: './worker.js',
        db: ['DB:my-database'],
      });

      expect(callTool).toHaveBeenCalledWith('paas.mcp.atxp.ai', 'deploy_worker', {
        name: 'my-worker',
        code: mockCode,
        database_bindings: [{ binding: 'DB', database_name: 'my-database' }],
      });
    });

    it('should include storage bindings when provided', async () => {
      const mockCode = 'export default { fetch() { return new Response("Hello"); } }';
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(mockCode);
      vi.mocked(callTool).mockResolvedValue('{"success": true}');

      await workerDeployCommand('my-worker', {
        code: './worker.js',
        bucket: ['BUCKET:my-bucket'],
      });

      expect(callTool).toHaveBeenCalledWith('paas.mcp.atxp.ai', 'deploy_worker', {
        name: 'my-worker',
        code: mockCode,
        storage_bindings: [{ binding: 'BUCKET', bucket_name: 'my-bucket' }],
      });
    });

    it('should enable analytics when flag is set', async () => {
      const mockCode = 'export default { fetch() { return new Response("Hello"); } }';
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(mockCode);
      vi.mocked(callTool).mockResolvedValue('{"success": true}');

      await workerDeployCommand('my-worker', {
        code: './worker.js',
        enableAnalytics: true,
      });

      expect(callTool).toHaveBeenCalledWith('paas.mcp.atxp.ai', 'deploy_worker', {
        name: 'my-worker',
        code: mockCode,
        enable_analytics: true,
      });
    });

    it('should enable analytics with custom binding name', async () => {
      const mockCode = 'export default { fetch() { return new Response("Hello"); } }';
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(mockCode);
      vi.mocked(callTool).mockResolvedValue('{"success": true}');

      await workerDeployCommand('my-worker', {
        code: './worker.js',
        enableAnalytics: 'MY_STATS',
      });

      expect(callTool).toHaveBeenCalledWith('paas.mcp.atxp.ai', 'deploy_worker', {
        name: 'my-worker',
        code: mockCode,
        enable_analytics: 'MY_STATS',
      });
    });

    it('should reject ANALYTICS env var when using default analytics binding', async () => {
      const mockCode = 'export default { fetch() { return new Response("Hello"); } }';
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(mockCode);

      await expect(
        workerDeployCommand('my-worker', {
          code: './worker.js',
          enableAnalytics: true,
          env: ['ANALYTICS=test'],
        })
      ).rejects.toThrow('process.exit called');
      expect(console.error).toHaveBeenCalled();
    });

    it('should reject custom binding name as env var when using custom analytics binding', async () => {
      const mockCode = 'export default { fetch() { return new Response("Hello"); } }';
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(mockCode);

      await expect(
        workerDeployCommand('my-worker', {
          code: './worker.js',
          enableAnalytics: 'MY_STATS',
          env: ['MY_STATS=test'],
        })
      ).rejects.toThrow('process.exit called');
      expect(console.error).toHaveBeenCalled();
    });

    it('should allow ANALYTICS env var when using different custom binding name', async () => {
      const mockCode = 'export default { fetch() { return new Response("Hello"); } }';
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(mockCode);
      vi.mocked(callTool).mockResolvedValue('{"success": true}');

      await workerDeployCommand('my-worker', {
        code: './worker.js',
        enableAnalytics: 'MY_STATS',
        env: ['ANALYTICS=test'],
      });

      expect(callTool).toHaveBeenCalledWith('paas.mcp.atxp.ai', 'deploy_worker', {
        name: 'my-worker',
        code: mockCode,
        enable_analytics: 'MY_STATS',
        env_vars: { ANALYTICS: 'test' },
      });
    });

    it('should exit with error when code flag is missing', async () => {
      await expect(workerDeployCommand('my-worker', {})).rejects.toThrow('process.exit called');
      expect(console.error).toHaveBeenCalled();
    });

    it('should exit with error when code file does not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      await expect(workerDeployCommand('my-worker', { code: './missing.js' })).rejects.toThrow(
        'process.exit called'
      );
      expect(console.error).toHaveBeenCalled();
    });

    it('should pass env vars from --env flag', async () => {
      const mockCode = 'export default { fetch() { return new Response("Hello"); } }';
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(mockCode);
      vi.mocked(callTool).mockResolvedValue('{"success": true}');

      await workerDeployCommand('my-worker', {
        code: './worker.js',
        env: ['FOO=bar', 'BAZ=qux'],
      });

      expect(callTool).toHaveBeenCalledWith('paas.mcp.atxp.ai', 'deploy_worker', {
        name: 'my-worker',
        code: mockCode,
        env_vars: { FOO: 'bar', BAZ: 'qux' },
      });
    });

    it('should pass env vars from --env-file flag', async () => {
      const mockCode = 'export default { fetch() { return new Response("Hello"); } }';
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync)
        .mockReturnValueOnce(mockCode) // code file
        .mockReturnValueOnce('FILE_VAR=file_value\nANOTHER=another_value'); // env file

      vi.mocked(callTool).mockResolvedValue('{"success": true}');

      await workerDeployCommand('my-worker', {
        code: './worker.js',
        envFile: './test.env',
      });

      expect(callTool).toHaveBeenCalledWith('paas.mcp.atxp.ai', 'deploy_worker', {
        name: 'my-worker',
        code: mockCode,
        env_vars: { FILE_VAR: 'file_value', ANOTHER: 'another_value' },
      });
    });

    it('should give --env flag precedence over --env-file', async () => {
      const mockCode = 'export default { fetch() { return new Response("Hello"); } }';
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync)
        .mockReturnValueOnce(mockCode) // code file
        .mockReturnValueOnce('SHARED_VAR=from_file\nFILE_ONLY=file_value'); // env file

      vi.mocked(callTool).mockResolvedValue('{"success": true}');

      await workerDeployCommand('my-worker', {
        code: './worker.js',
        envFile: './test.env',
        env: ['SHARED_VAR=from_cli', 'CLI_ONLY=cli_value'],
      });

      expect(callTool).toHaveBeenCalledWith('paas.mcp.atxp.ai', 'deploy_worker', {
        name: 'my-worker',
        code: mockCode,
        env_vars: {
          SHARED_VAR: 'from_cli', // CLI overrides file
          FILE_ONLY: 'file_value', // File-only var preserved
          CLI_ONLY: 'cli_value', // CLI-only var preserved
        },
      });
    });

    it('should warn about sensitive env var names', async () => {
      const mockCode = 'export default { fetch() { return new Response("Hello"); } }';
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(mockCode);
      vi.mocked(callTool).mockResolvedValue('{"success": true}');

      await workerDeployCommand('my-worker', {
        code: './worker.js',
        env: ['API_KEY=sk-123', 'DATABASE_URL=postgres://localhost'],
      });

      // Should have warned about API_KEY (contains KEY)
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('may contain sensitive data')
      );
    });

    it('should warn about multiple sensitive env var names', async () => {
      const mockCode = 'export default { fetch() { return new Response("Hello"); } }';
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(mockCode);
      vi.mocked(callTool).mockResolvedValue('{"success": true}');

      await workerDeployCommand('my-worker', {
        code: './worker.js',
        env: ['API_KEY=sk-123', 'MY_SECRET=secret', 'AUTH_TOKEN=token123'],
      });

      // Should have warned about sensitive vars
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('may contain sensitive data')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Consider using Cloudflare Secrets')
      );
    });

    it('should not warn when no sensitive env var names', async () => {
      const mockCode = 'export default { fetch() { return new Response("Hello"); } }';
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(mockCode);
      vi.mocked(callTool).mockResolvedValue('{"success": true}');

      await workerDeployCommand('my-worker', {
        code: './worker.js',
        env: ['DATABASE_URL=postgres://localhost', 'APP_NAME=myapp'],
      });

      // Should NOT have warned about sensitive vars
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining('may contain sensitive data')
      );
    });

    it('should reject invalid env var format (no equals sign)', async () => {
      const mockCode = 'export default { fetch() { return new Response("Hello"); } }';
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(mockCode);

      await expect(
        workerDeployCommand('my-worker', {
          code: './worker.js',
          env: ['INVALID_NO_EQUALS'],
        })
      ).rejects.toThrow('process.exit called');
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Invalid env var format')
      );
    });

    it('should reject invalid env var name', async () => {
      const mockCode = 'export default { fetch() { return new Response("Hello"); } }';
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(mockCode);

      await expect(
        workerDeployCommand('my-worker', {
          code: './worker.js',
          env: ['123INVALID=value'],
        })
      ).rejects.toThrow('process.exit called');
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Invalid env var name')
      );
    });
  });

  describe('workerListCommand', () => {
    it('should list all workers', async () => {
      vi.mocked(callTool).mockResolvedValue('{"success": true, "workers": []}');

      await workerListCommand();

      expect(callTool).toHaveBeenCalledWith('paas.mcp.atxp.ai', 'list_deployments', {});
    });
  });

  describe('workerLogsCommand', () => {
    it('should get worker logs', async () => {
      vi.mocked(callTool).mockResolvedValue('{"success": true, "logs": []}');

      await workerLogsCommand('my-worker', {});

      expect(callTool).toHaveBeenCalledWith('paas.mcp.atxp.ai', 'get_logs', {
        name: 'my-worker',
      });
    });

    it('should pass optional filters', async () => {
      vi.mocked(callTool).mockResolvedValue('{"success": true, "logs": []}');

      await workerLogsCommand('my-worker', {
        limit: 50,
        level: 'error',
        since: '2024-01-01T00:00:00Z',
      });

      expect(callTool).toHaveBeenCalledWith('paas.mcp.atxp.ai', 'get_logs', {
        name: 'my-worker',
        limit: 50,
        level: 'error',
        since: '2024-01-01T00:00:00Z',
      });
    });
  });

  describe('workerDeleteCommand', () => {
    it('should delete a worker', async () => {
      vi.mocked(callTool).mockResolvedValue('{"success": true}');

      await workerDeleteCommand('my-worker');

      expect(callTool).toHaveBeenCalledWith('paas.mcp.atxp.ai', 'delete_worker', {
        name: 'my-worker',
      });
    });
  });

  describe('workerInfoCommand', () => {
    it('should get worker info and display details', async () => {
      const mockResponse = JSON.stringify({
        success: true,
        worker: {
          name: 'my-worker',
          url: 'https://my-worker.example.com',
          createdOn: '2024-01-01T00:00:00Z',
          modifiedOn: '2024-01-02T00:00:00Z',
          bindings: {
            databases: [],
            storage: [],
            analytics: [],
            envVars: [],
            secrets: [],
          },
        },
      });
      vi.mocked(callTool).mockResolvedValue(mockResponse);

      await workerInfoCommand('my-worker');

      expect(callTool).toHaveBeenCalledWith('paas.mcp.atxp.ai', 'get_worker_info', {
        name: 'my-worker',
      });
      expect(console.log).toHaveBeenCalled();
    });

    it('should display all binding types when present', async () => {
      const mockResponse = JSON.stringify({
        success: true,
        worker: {
          name: 'my-worker',
          url: 'https://my-worker.example.com',
          createdOn: '2024-01-01T00:00:00Z',
          modifiedOn: '2024-01-02T00:00:00Z',
          bindings: {
            databases: [{ binding: 'DB', databaseId: 'db-123' }],
            storage: [{ binding: 'BUCKET', bucketName: 'my-bucket' }],
            analytics: [{ binding: 'ANALYTICS', dataset: 'my-dataset' }],
            envVars: ['API_URL', 'DEBUG'],
            secrets: ['API_KEY'],
          },
        },
      });
      vi.mocked(callTool).mockResolvedValue(mockResponse);

      await workerInfoCommand('my-worker');

      expect(callTool).toHaveBeenCalledWith('paas.mcp.atxp.ai', 'get_worker_info', {
        name: 'my-worker',
      });
      expect(console.log).toHaveBeenCalled();
    });

    it('should call process.exit when worker is not found', async () => {
      const mockResponse = JSON.stringify({
        success: false,
        error: 'Worker not found',
      });
      vi.mocked(callTool).mockResolvedValue(mockResponse);
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await workerInfoCommand('nonexistent-worker');

      expect(console.error).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle error response without error message', async () => {
      const mockResponse = JSON.stringify({
        success: false,
      });
      vi.mocked(callTool).mockResolvedValue(mockResponse);
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await workerInfoCommand('my-worker');

      expect(console.error).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should fallback to raw output when JSON parsing fails', async () => {
      vi.mocked(callTool).mockResolvedValue('not valid json');

      await workerInfoCommand('my-worker');

      expect(console.log).toHaveBeenCalledWith('not valid json');
    });
  });
});

