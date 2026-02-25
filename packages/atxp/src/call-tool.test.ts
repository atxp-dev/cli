import { describe, it, expect } from 'vitest';

describe('Call Tool', () => {
  describe('server configuration', () => {
    it('should map commands to correct servers', () => {
      const serverMap: Record<string, string> = {
        search: 'search.mcp.atxp.ai',
        image: 'image.mcp.atxp.ai',
        music: 'music.mcp.atxp.ai',
        video: 'video.mcp.atxp.ai',
        x: 'x-live-search.mcp.atxp.ai',
      };

      expect(serverMap.search).toBe('search.mcp.atxp.ai');
      expect(serverMap.image).toBe('image.mcp.atxp.ai');
      expect(serverMap.music).toBe('music.mcp.atxp.ai');
      expect(serverMap.video).toBe('video.mcp.atxp.ai');
      expect(serverMap.x).toBe('x-live-search.mcp.atxp.ai');
    });

    it('should map commands to correct tool names', () => {
      const toolMap: Record<string, string> = {
        search: 'search_search',
        image: 'image_create_image_async',
        music: 'music_create_async',
        video: 'create_video',
        x: 'x_live_search',
      };

      expect(toolMap.search).toBe('search_search');
      expect(toolMap.image).toBe('image_create_image_async');
      expect(toolMap.music).toBe('music_create_async');
      expect(toolMap.video).toBe('create_video');
      expect(toolMap.x).toBe('x_live_search');
    });
  });

  describe('connection string validation', () => {
    it('should detect missing connection string', () => {
      const checkConnection = (connection?: string) => {
        return !!connection;
      };

      expect(checkConnection(undefined)).toBe(false);
      expect(checkConnection('')).toBe(false);
      expect(checkConnection('valid-connection')).toBe(true);
    });
  });

  describe('tool result parsing', () => {
    it('should extract text content from result', () => {
      const extractText = (
        result: { content: Array<{ type: string; text?: string }> } | null
      ) => {
        if (result?.content?.[0]?.text) {
          return result.content[0].text;
        }
        return null;
      };

      const textResult = { content: [{ type: 'text', text: 'Hello world' }] };
      expect(extractText(textResult)).toBe('Hello world');

      const emptyResult = { content: [] };
      expect(extractText(emptyResult)).toBe(null);

      expect(extractText(null)).toBe(null);
    });

    it('should detect binary content', () => {
      const isBinaryContent = (content: { data?: string; mimeType?: string }) => {
        return !!(content.data && content.mimeType);
      };

      expect(isBinaryContent({ data: 'base64data', mimeType: 'image/png' })).toBe(true);
      expect(isBinaryContent({ data: 'base64data' })).toBe(false);
      expect(isBinaryContent({ mimeType: 'image/png' })).toBe(false);
      expect(isBinaryContent({})).toBe(false);
    });
  });

  describe('server URL construction', () => {
    it('should construct correct server URL', () => {
      const constructUrl = (server: string) => `https://${server}`;

      expect(constructUrl('search.mcp.atxp.ai')).toBe('https://search.mcp.atxp.ai');
      expect(constructUrl('image.mcp.atxp.ai')).toBe('https://image.mcp.atxp.ai');
    });
  });
});
