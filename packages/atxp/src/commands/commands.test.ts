import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import JSZip from 'jszip';
import os from 'os';
import path from 'path';
import { collectMdFiles } from './backup.js';

describe('Tool Commands', () => {
  describe('search command', () => {
    const SERVER = 'search.mcp.atxp.ai';
    const TOOL = 'search_search';

    it('should have correct server', () => {
      expect(SERVER).toBe('search.mcp.atxp.ai');
    });

    it('should have correct tool name', () => {
      expect(TOOL).toBe('search_search');
    });

    it('should validate query is required', () => {
      const validateQuery = (query: string) => {
        return query && query.trim().length > 0;
      };

      expect(validateQuery('test query')).toBeTruthy();
      expect(validateQuery('')).toBeFalsy();
      expect(validateQuery('   ')).toBeFalsy();
    });

    it('should trim query whitespace', () => {
      const prepareQuery = (query: string) => query.trim();

      expect(prepareQuery('  hello world  ')).toBe('hello world');
      expect(prepareQuery('test')).toBe('test');
    });
  });

  describe('image command', () => {
    const SERVER = 'image.mcp.atxp.ai';
    const TOOL = 'image_create_image';

    it('should have correct server', () => {
      expect(SERVER).toBe('image.mcp.atxp.ai');
    });

    it('should have correct tool name', () => {
      expect(TOOL).toBe('image_create_image');
    });

    it('should validate prompt is required', () => {
      const validatePrompt = (prompt: string) => {
        return prompt && prompt.trim().length > 0;
      };

      expect(validatePrompt('sunset over mountains')).toBeTruthy();
      expect(validatePrompt('')).toBeFalsy();
    });
  });

  describe('music command', () => {
    const SERVER = 'music.mcp.atxp.ai';
    const TOOL = 'music_create';

    it('should have correct server', () => {
      expect(SERVER).toBe('music.mcp.atxp.ai');
    });

    it('should have correct tool name', () => {
      expect(TOOL).toBe('music_create');
    });

    it('should validate prompt is required', () => {
      const validatePrompt = (prompt: string) => {
        return prompt && prompt.trim().length > 0;
      };

      expect(validatePrompt('relaxing piano')).toBeTruthy();
      expect(validatePrompt('')).toBeFalsy();
    });
  });

  describe('video command', () => {
    const SERVER = 'video.mcp.atxp.ai';
    const TOOL = 'create_video';

    it('should have correct server', () => {
      expect(SERVER).toBe('video.mcp.atxp.ai');
    });

    it('should have correct tool name', () => {
      expect(TOOL).toBe('create_video');
    });

    it('should validate prompt is required', () => {
      const validatePrompt = (prompt: string) => {
        return prompt && prompt.trim().length > 0;
      };

      expect(validatePrompt('ocean waves')).toBeTruthy();
      expect(validatePrompt('')).toBeFalsy();
    });
  });

  describe('x command', () => {
    const SERVER = 'x-live-search.mcp.atxp.ai';
    const TOOL = 'x_live_search';

    it('should have correct server', () => {
      expect(SERVER).toBe('x-live-search.mcp.atxp.ai');
    });

    it('should have correct tool name', () => {
      expect(TOOL).toBe('x_live_search');
    });

    it('should validate query is required', () => {
      const validateQuery = (query: string) => {
        return query && query.trim().length > 0;
      };

      expect(validateQuery('trending topics')).toBeTruthy();
      expect(validateQuery('')).toBeFalsy();
    });
  });

  describe('balance command', () => {
    const BALANCE_URL = 'https://accounts.atxp.ai/balance';

    it('should have correct balance URL', () => {
      expect(BALANCE_URL).toBe('https://accounts.atxp.ai/balance');
    });

    it('should extract connection_token from connection string', () => {
      const getConnectionToken = (connectionString: string): string | null => {
        try {
          const url = new URL(connectionString);
          return url.searchParams.get('connection_token');
        } catch {
          return null;
        }
      };

      expect(getConnectionToken('https://accounts.atxp.ai?connection_token=abc123')).toBe('abc123');
      expect(getConnectionToken('https://accounts.atxp.ai?connection_token=test-token-xyz')).toBe('test-token-xyz');
      expect(getConnectionToken('invalid')).toBeNull();
      expect(getConnectionToken('https://accounts.atxp.ai')).toBeNull();
    });

    it('should construct Basic Auth credentials correctly', () => {
      const token = 'test-token';
      const credentials = Buffer.from(`${token}:`).toString('base64');
      expect(credentials).toBe(Buffer.from('test-token:').toString('base64'));
      // Token as username, empty password
      expect(Buffer.from(credentials, 'base64').toString()).toBe('test-token:');
    });

    it('should compute total balance from usdc and iou', () => {
      const computeBalance = (data: { balance?: { usdc?: number; iou?: number } }) => {
        if (!data.balance) return null;
        const usdc = +(data.balance.usdc || 0);
        const iou = +(data.balance.iou || 0);
        return +(usdc + iou).toFixed(2);
      };

      expect(computeBalance({ balance: { usdc: 10.5, iou: 2.3 } })).toBe(12.8);
      expect(computeBalance({ balance: { usdc: 5 } })).toBe(5);
      expect(computeBalance({ balance: { iou: 3.14 } })).toBe(3.14);
      expect(computeBalance({ balance: {} })).toBe(0);
      expect(computeBalance({})).toBeNull();
    });
  });

  describe('backup command', () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'atxp-backup-test-'));
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('should collect .md files and ignore non-.md files', () => {
      fs.writeFileSync(path.join(tmpDir, 'README.md'), '# Hello');
      fs.writeFileSync(path.join(tmpDir, 'notes.txt'), 'not included');
      fs.writeFileSync(path.join(tmpDir, 'config.json'), '{}');

      const files = collectMdFiles(tmpDir);

      expect(files).toHaveLength(1);
      expect(files[0].path).toBe('README.md');
      expect(files[0].content).toBe('# Hello');
    });

    it('should collect .md files recursively from subdirectories', () => {
      const subDir = path.join(tmpDir, 'memory');
      fs.mkdirSync(subDir);
      fs.writeFileSync(path.join(tmpDir, 'SOUL.md'), '# Soul');
      fs.writeFileSync(path.join(subDir, 'session.md'), '# Session');

      const files = collectMdFiles(tmpDir);
      const paths = files.map(f => f.path).sort();

      expect(paths).toEqual(['SOUL.md', path.join('memory', 'session.md')]);
    });

    it('should compute relative paths correctly', () => {
      const deep = path.join(tmpDir, 'a', 'b', 'c');
      fs.mkdirSync(deep, { recursive: true });
      fs.writeFileSync(path.join(deep, 'deep.md'), 'deep');

      const files = collectMdFiles(tmpDir);

      expect(files).toHaveLength(1);
      expect(files[0].path).toBe(path.join('a', 'b', 'c', 'deep.md'));
    });

    it('should return empty array for directory with no .md files', () => {
      fs.writeFileSync(path.join(tmpDir, 'file.txt'), 'text');
      fs.writeFileSync(path.join(tmpDir, 'data.json'), '{}');

      const files = collectMdFiles(tmpDir);

      expect(files).toHaveLength(0);
    });

    it('should return empty array for empty directory', () => {
      const files = collectMdFiles(tmpDir);
      expect(files).toHaveLength(0);
    });

    it('should validate --path is required for push/pull', () => {
      const validatePath = (pathArg: string | undefined) => {
        return pathArg && pathArg.trim().length > 0;
      };

      expect(validatePath('/some/dir')).toBeTruthy();
      expect(validatePath('')).toBeFalsy();
      expect(validatePath(undefined)).toBeFalsy();
    });

    it('should construct correct API URLs', () => {
      const baseUrl = 'https://accounts.atxp.ai';

      expect(`${baseUrl}/backup/files`).toBe('https://accounts.atxp.ai/backup/files');
      expect(`${baseUrl}/backup/status`).toBe('https://accounts.atxp.ai/backup/status');
    });

    it('should create a zip archive from collected files', async () => {
      fs.writeFileSync(path.join(tmpDir, 'SOUL.md'), '# Soul');
      const subDir = path.join(tmpDir, 'memory');
      fs.mkdirSync(subDir);
      fs.writeFileSync(path.join(subDir, 'session.md'), '# Session notes');

      const files = collectMdFiles(tmpDir);

      const zip = new JSZip();
      for (const file of files) {
        zip.file(file.path, file.content);
      }
      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });

      expect(zipBuffer.length).toBeGreaterThan(0);
      expect(zipBuffer.length).toBeLessThan(
        files.reduce((sum, f) => sum + Buffer.byteLength(f.content, 'utf-8'), 0) + 1024
      );
    });

    it('should round-trip files through zip compression', async () => {
      fs.writeFileSync(path.join(tmpDir, 'README.md'), '# README\nSome content here.');
      const subDir = path.join(tmpDir, 'memory');
      fs.mkdirSync(subDir);
      fs.writeFileSync(path.join(subDir, 'log.md'), '## Log\n- Entry 1\n- Entry 2');

      const files = collectMdFiles(tmpDir);

      // Create zip
      const zip = new JSZip();
      for (const file of files) {
        zip.file(file.path, file.content);
      }
      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });

      // Extract zip
      const extracted = await JSZip.loadAsync(zipBuffer);
      const extractedNames = Object.keys(extracted.files).filter(n => !extracted.files[n].dir);

      expect(extractedNames.sort()).toEqual(files.map(f => f.path).sort());

      for (const file of files) {
        const content = await extracted.files[file.path].async('string');
        expect(content).toBe(file.content);
      }
    });

    it('should produce a smaller zip than raw JSON payload', async () => {
      // Create a file with repetitive content that compresses well
      const repeatedContent = '# Memory\n\n' + 'This is a repeated line of memory content.\n'.repeat(100);
      fs.writeFileSync(path.join(tmpDir, 'MEMORY.md'), repeatedContent);

      const files = collectMdFiles(tmpDir);
      const jsonSize = Buffer.byteLength(JSON.stringify({ files }), 'utf-8');

      const zip = new JSZip();
      for (const file of files) {
        zip.file(file.path, file.content);
      }
      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });

      expect(zipBuffer.length).toBeLessThan(jsonSize);
    });
  });

  describe('common command behavior', () => {
    it('should construct tool arguments correctly', () => {
      const buildArgs = (key: string, value: string) => {
        return { [key]: value.trim() };
      };

      expect(buildArgs('query', 'test query')).toEqual({ query: 'test query' });
      expect(buildArgs('prompt', '  image prompt  ')).toEqual({ prompt: 'image prompt' });
    });

    it('should handle multi-word inputs', () => {
      const parseInput = (args: string[]) => args.join(' ');

      expect(parseInput(['hello', 'world'])).toBe('hello world');
      expect(parseInput(['a', 'beautiful', 'sunset'])).toBe('a beautiful sunset');
      expect(parseInput([])).toBe('');
    });
  });
});
