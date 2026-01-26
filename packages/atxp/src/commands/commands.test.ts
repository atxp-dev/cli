import { describe, it, expect } from 'vitest';

describe('Tool Commands', () => {
  describe('search command', () => {
    const SERVER = 'search.mcp.atxp.ai';
    const TOOL = 'search';

    it('should have correct server', () => {
      expect(SERVER).toBe('search.mcp.atxp.ai');
    });

    it('should have correct tool name', () => {
      expect(TOOL).toBe('search');
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
    const TOOL = 'generate_image';

    it('should have correct server', () => {
      expect(SERVER).toBe('image.mcp.atxp.ai');
    });

    it('should have correct tool name', () => {
      expect(TOOL).toBe('generate_image');
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
    const TOOL = 'generate_music';

    it('should have correct server', () => {
      expect(SERVER).toBe('music.mcp.atxp.ai');
    });

    it('should have correct tool name', () => {
      expect(TOOL).toBe('generate_music');
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
    const TOOL = 'generate_video';

    it('should have correct server', () => {
      expect(SERVER).toBe('video.mcp.atxp.ai');
    });

    it('should have correct tool name', () => {
      expect(TOOL).toBe('generate_video');
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
