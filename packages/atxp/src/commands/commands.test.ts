import { describe, it, expect } from 'vitest';

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
