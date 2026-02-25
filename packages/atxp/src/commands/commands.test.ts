import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import JSZip from 'jszip';
import os from 'os';
import path from 'path';
import { collectFiles, chunkMarkdown, textToVector } from './memory.js';

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
    const TOOL = 'image_create_image_async';

    it('should have correct server', () => {
      expect(SERVER).toBe('image.mcp.atxp.ai');
    });

    it('should have correct tool name', () => {
      expect(TOOL).toBe('image_create_image_async');
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
    const TOOL = 'music_create_async';

    it('should have correct server', () => {
      expect(SERVER).toBe('music.mcp.atxp.ai');
    });

    it('should have correct tool name', () => {
      expect(TOOL).toBe('music_create_async');
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

  describe('memory command', () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'atxp-memory-test-'));
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('should collect all text files including non-.md files', () => {
      fs.writeFileSync(path.join(tmpDir, 'README.md'), '# Hello');
      fs.writeFileSync(path.join(tmpDir, 'notes.txt'), 'included too');
      fs.writeFileSync(path.join(tmpDir, 'config.json'), '{}');

      const files = collectFiles(tmpDir);
      const paths = files.map(f => f.path).sort();

      expect(files).toHaveLength(3);
      expect(paths).toEqual(['README.md', 'config.json', 'notes.txt']);
    });

    it('should collect files recursively from subdirectories', () => {
      const subDir = path.join(tmpDir, 'memory');
      fs.mkdirSync(subDir);
      fs.writeFileSync(path.join(tmpDir, 'SOUL.md'), '# Soul');
      fs.writeFileSync(path.join(subDir, 'session.md'), '# Session');

      const files = collectFiles(tmpDir);
      const paths = files.map(f => f.path).sort();

      expect(paths).toEqual(['SOUL.md', path.join('memory', 'session.md')]);
    });

    it('should compute relative paths correctly', () => {
      const deep = path.join(tmpDir, 'a', 'b', 'c');
      fs.mkdirSync(deep, { recursive: true });
      fs.writeFileSync(path.join(deep, 'deep.md'), 'deep');

      const files = collectFiles(tmpDir);

      expect(files).toHaveLength(1);
      expect(files[0].path).toBe(path.join('a', 'b', 'c', 'deep.md'));
    });

    it('should return empty array for empty directory', () => {
      const files = collectFiles(tmpDir);
      expect(files).toHaveLength(0);
    });

    it('should skip node_modules and .git directories', () => {
      fs.writeFileSync(path.join(tmpDir, 'index.ts'), 'console.log("hi")');
      fs.mkdirSync(path.join(tmpDir, 'node_modules', 'pkg'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'node_modules', 'pkg', 'index.js'), 'module.exports = {}');
      fs.mkdirSync(path.join(tmpDir, '.git', 'objects'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, '.git', 'HEAD'), 'ref: refs/heads/main');

      const files = collectFiles(tmpDir);

      expect(files).toHaveLength(1);
      expect(files[0].path).toBe('index.ts');
    });

    it('should respect .gitignore rules', () => {
      fs.writeFileSync(path.join(tmpDir, '.gitignore'), 'secret.env\nlogs/\n');
      fs.writeFileSync(path.join(tmpDir, 'app.ts'), 'const x = 1');
      fs.writeFileSync(path.join(tmpDir, 'secret.env'), 'API_KEY=abc');
      fs.mkdirSync(path.join(tmpDir, 'logs'));
      fs.writeFileSync(path.join(tmpDir, 'logs', 'app.log'), 'log entry');

      const files = collectFiles(tmpDir);
      const paths = files.map(f => f.path).sort();

      expect(paths).toEqual(['.gitignore', 'app.ts']);
    });

    it('should skip binary files', () => {
      fs.writeFileSync(path.join(tmpDir, 'readme.md'), '# Hello');
      // Write a file with null bytes (binary)
      fs.writeFileSync(path.join(tmpDir, 'image.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x00]));

      const files = collectFiles(tmpDir);

      expect(files).toHaveLength(1);
      expect(files[0].path).toBe('readme.md');
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

      const files = collectFiles(tmpDir);

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

      const files = collectFiles(tmpDir);

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

      const files = collectFiles(tmpDir);
      const jsonSize = Buffer.byteLength(JSON.stringify({ files }), 'utf-8');

      const zip = new JSZip();
      for (const file of files) {
        zip.file(file.path, file.content);
      }
      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });

      expect(zipBuffer.length).toBeLessThan(jsonSize);
    });
  });

  describe('chunkMarkdown', () => {
    it('should split markdown by headings', () => {
      const content = '# Title\nSome intro text.\n\n## Section A\nContent A.\n\n## Section B\nContent B.';
      const chunks = chunkMarkdown('test.md', content);

      expect(chunks).toHaveLength(3);
      expect(chunks[0].heading).toBe('Title');
      expect(chunks[0].text).toContain('Some intro text.');
      expect(chunks[1].heading).toBe('Section A');
      expect(chunks[1].text).toContain('Content A.');
      expect(chunks[2].heading).toBe('Section B');
      expect(chunks[2].text).toContain('Content B.');
    });

    it('should use file path as heading for content without headings', () => {
      const content = 'Just some plain text\nwith multiple lines.';
      const chunks = chunkMarkdown('notes.md', content);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].heading).toBe('notes.md');
      expect(chunks[0].filePath).toBe('notes.md');
      expect(chunks[0].text).toBe('Just some plain text\nwith multiple lines.');
    });

    it('should return empty array for empty content', () => {
      const chunks = chunkMarkdown('empty.md', '');
      expect(chunks).toHaveLength(0);
    });

    it('should handle h1, h2, and h3 headings', () => {
      const content = '# H1\nOne\n## H2\nTwo\n### H3\nThree';
      const chunks = chunkMarkdown('test.md', content);

      expect(chunks).toHaveLength(3);
      expect(chunks[0].heading).toBe('H1');
      expect(chunks[1].heading).toBe('H2');
      expect(chunks[2].heading).toBe('H3');
    });

    it('should track start line numbers', () => {
      const content = '# Title\nLine 2\n\n## Section\nLine 5';
      const chunks = chunkMarkdown('test.md', content);

      expect(chunks[0].startLine).toBe(1);
      expect(chunks[1].startLine).toBe(4);
    });
  });

  describe('textToVector', () => {
    it('should return a vector of length 256', () => {
      const vec = textToVector('hello world');
      expect(vec).toHaveLength(256);
    });

    it('should return a normalized vector', () => {
      const vec = textToVector('the quick brown fox jumps over the lazy dog');
      const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
      expect(norm).toBeCloseTo(1.0, 4);
    });

    it('should return zero vector for empty input', () => {
      const vec = textToVector('');
      const allZero = vec.every((v) => v === 0);
      expect(allZero).toBe(true);
    });

    it('should produce similar vectors for similar text', () => {
      const vec1 = textToVector('authentication login flow');
      const vec2 = textToVector('authentication login process');
      const vec3 = textToVector('ocean waves sunset beach');

      // Cosine similarity (vectors are already normalized)
      const sim12 = vec1.reduce((sum, v, i) => sum + v * vec2[i], 0);
      const sim13 = vec1.reduce((sum, v, i) => sum + v * vec3[i], 0);

      // Similar texts should have higher similarity than dissimilar ones
      expect(sim12).toBeGreaterThan(sim13);
    });

    it('should be deterministic', () => {
      const vec1 = textToVector('test input');
      const vec2 = textToVector('test input');
      expect(vec1).toEqual(vec2);
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
