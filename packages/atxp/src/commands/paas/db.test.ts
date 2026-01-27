import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the call-tool module
vi.mock('../../call-tool.js', () => ({
  callTool: vi.fn(),
}));

import { callTool } from '../../call-tool.js';
import {
  dbCreateCommand,
  dbListCommand,
  dbQueryCommand,
  dbDeleteCommand,
} from './db.js';

describe('Database Commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
  });

  describe('dbCreateCommand', () => {
    it('should create a database', async () => {
      vi.mocked(callTool).mockResolvedValue('{"success": true}');

      await dbCreateCommand('my-database');

      expect(callTool).toHaveBeenCalledWith('paas.mcp.atxp.ai', 'create_database', {
        name: 'my-database',
      });
    });
  });

  describe('dbListCommand', () => {
    it('should list all databases', async () => {
      vi.mocked(callTool).mockResolvedValue('{"success": true, "databases": []}');

      await dbListCommand();

      expect(callTool).toHaveBeenCalledWith('paas.mcp.atxp.ai', 'list_databases', {});
    });
  });

  describe('dbQueryCommand', () => {
    it('should execute a SQL query', async () => {
      vi.mocked(callTool).mockResolvedValue('{"success": true, "results": []}');

      await dbQueryCommand('my-database', { sql: 'SELECT * FROM users' });

      expect(callTool).toHaveBeenCalledWith('paas.mcp.atxp.ai', 'query', {
        database: 'my-database',
        sql: 'SELECT * FROM users',
      });
    });

    it('should pass params when provided as JSON', async () => {
      vi.mocked(callTool).mockResolvedValue('{"success": true, "results": []}');

      await dbQueryCommand('my-database', {
        sql: 'SELECT * FROM users WHERE id = ?',
        params: '["123"]',
      });

      expect(callTool).toHaveBeenCalledWith('paas.mcp.atxp.ai', 'query', {
        database: 'my-database',
        sql: 'SELECT * FROM users WHERE id = ?',
        params: ['123'],
      });
    });

    it('should exit with error when sql flag is missing', async () => {
      await expect(dbQueryCommand('my-database', {})).rejects.toThrow('process.exit called');
      expect(console.error).toHaveBeenCalled();
    });

    it('should exit with error when params is invalid JSON', async () => {
      await expect(
        dbQueryCommand('my-database', {
          sql: 'SELECT * FROM users',
          params: 'invalid-json',
        })
      ).rejects.toThrow('process.exit called');
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('dbDeleteCommand', () => {
    it('should delete a database', async () => {
      vi.mocked(callTool).mockResolvedValue('{"success": true}');

      await dbDeleteCommand('my-database');

      expect(callTool).toHaveBeenCalledWith('paas.mcp.atxp.ai', 'delete_database', {
        name: 'my-database',
      });
    });
  });
});
