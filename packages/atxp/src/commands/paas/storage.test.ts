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
    writeFileSync: vi.fn(),
  },
}));

import { callTool } from '../../call-tool.js';
import {
  storageCreateCommand,
  storageListCommand,
  storageUploadCommand,
  storageDownloadCommand,
  storageFilesCommand,
  storageDeleteBucketCommand,
  storageDeleteFileCommand,
} from './storage.js';

describe('Storage Commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
  });

  describe('storageCreateCommand', () => {
    it('should create a bucket', async () => {
      vi.mocked(callTool).mockResolvedValue('{"success": true}');

      await storageCreateCommand('my-bucket');

      expect(callTool).toHaveBeenCalledWith('paas.mcp.atxp.ai', 'create_bucket', {
        name: 'my-bucket',
      });
    });
  });

  describe('storageListCommand', () => {
    it('should list all buckets', async () => {
      vi.mocked(callTool).mockResolvedValue('{"success": true, "buckets": []}');

      await storageListCommand();

      expect(callTool).toHaveBeenCalledWith('paas.mcp.atxp.ai', 'list_buckets', {});
    });
  });

  describe('storageUploadCommand', () => {
    it('should upload a text file', async () => {
      const mockContent = 'Hello, world!';
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from(mockContent));
      vi.mocked(callTool).mockResolvedValue('{"success": true}');

      await storageUploadCommand('my-bucket', 'hello.txt', { file: './hello.txt' });

      expect(callTool).toHaveBeenCalledWith('paas.mcp.atxp.ai', 'upload_file', {
        bucket: 'my-bucket',
        key: 'hello.txt',
        content: mockContent,
        is_base64: false,
        content_type: 'text/plain',
      });
    });

    it('should upload a binary file as base64', async () => {
      const mockBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]); // PNG magic bytes
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(mockBuffer);
      vi.mocked(callTool).mockResolvedValue('{"success": true}');

      await storageUploadCommand('my-bucket', 'image.png', { file: './image.png' });

      expect(callTool).toHaveBeenCalledWith('paas.mcp.atxp.ai', 'upload_file', {
        bucket: 'my-bucket',
        key: 'image.png',
        content: mockBuffer.toString('base64'),
        is_base64: true,
        content_type: 'image/png',
      });
    });

    it('should upload content directly', async () => {
      vi.mocked(callTool).mockResolvedValue('{"success": true}');

      await storageUploadCommand('my-bucket', 'data.json', { content: '{"key": "value"}' });

      expect(callTool).toHaveBeenCalledWith('paas.mcp.atxp.ai', 'upload_file', {
        bucket: 'my-bucket',
        key: 'data.json',
        content: '{"key": "value"}',
        is_base64: false,
      });
    });

    it('should exit with error when neither file nor content is provided', async () => {
      await expect(storageUploadCommand('my-bucket', 'file.txt', {})).rejects.toThrow(
        'process.exit called'
      );
      expect(console.error).toHaveBeenCalled();
    });

    it('should exit with error when file does not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      await expect(
        storageUploadCommand('my-bucket', 'file.txt', { file: './missing.txt' })
      ).rejects.toThrow('process.exit called');
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('storageDownloadCommand', () => {
    it('should download a file', async () => {
      vi.mocked(callTool).mockResolvedValue('{"success": true, "file": {"content": "Hello"}}');

      await storageDownloadCommand('my-bucket', 'hello.txt', {});

      expect(callTool).toHaveBeenCalledWith('paas.mcp.atxp.ai', 'get_file', {
        bucket: 'my-bucket',
        key: 'hello.txt',
      });
    });

    it('should save text file to output path', async () => {
      vi.mocked(callTool).mockResolvedValue(
        JSON.stringify({
          success: true,
          file: { content: 'Hello', is_base64: false },
        })
      );

      await storageDownloadCommand('my-bucket', 'hello.txt', { output: './output.txt' });

      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalled();
    });

    it('should save binary file to output path', async () => {
      const base64Content = Buffer.from('binary data').toString('base64');
      vi.mocked(callTool).mockResolvedValue(
        JSON.stringify({
          success: true,
          file: { content: base64Content, is_base64: true },
        })
      );

      await storageDownloadCommand('my-bucket', 'file.bin', { output: './output.bin' });

      expect(fs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe('storageFilesCommand', () => {
    it('should list files in a bucket', async () => {
      vi.mocked(callTool).mockResolvedValue('{"success": true, "files": []}');

      await storageFilesCommand('my-bucket', {});

      expect(callTool).toHaveBeenCalledWith('paas.mcp.atxp.ai', 'list_files', {
        bucket: 'my-bucket',
      });
    });

    it('should pass prefix and limit options', async () => {
      vi.mocked(callTool).mockResolvedValue('{"success": true, "files": []}');

      await storageFilesCommand('my-bucket', { prefix: 'images/', limit: 50 });

      expect(callTool).toHaveBeenCalledWith('paas.mcp.atxp.ai', 'list_files', {
        bucket: 'my-bucket',
        prefix: 'images/',
        limit: 50,
      });
    });
  });

  describe('storageDeleteBucketCommand', () => {
    it('should delete a bucket', async () => {
      vi.mocked(callTool).mockResolvedValue('{"success": true}');

      await storageDeleteBucketCommand('my-bucket');

      expect(callTool).toHaveBeenCalledWith('paas.mcp.atxp.ai', 'delete_bucket', {
        name: 'my-bucket',
      });
    });
  });

  describe('storageDeleteFileCommand', () => {
    it('should delete a file', async () => {
      vi.mocked(callTool).mockResolvedValue('{"success": true}');

      await storageDeleteFileCommand('my-bucket', 'file.txt');

      expect(callTool).toHaveBeenCalledWith('paas.mcp.atxp.ai', 'delete_file', {
        bucket: 'my-bucket',
        key: 'file.txt',
      });
    });
  });
});
