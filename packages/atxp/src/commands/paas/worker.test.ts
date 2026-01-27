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
} from './worker.js';

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
});
