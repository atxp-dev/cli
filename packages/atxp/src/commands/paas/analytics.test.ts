import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the call-tool module
vi.mock('../../call-tool.js', () => ({
  callTool: vi.fn(),
}));

import { callTool } from '../../call-tool.js';
import {
  analyticsQueryCommand,
  analyticsEventsCommand,
  analyticsStatsCommand,
} from './analytics.js';

describe('Analytics Commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
  });

  describe('analyticsQueryCommand', () => {
    it('should execute an analytics query', async () => {
      vi.mocked(callTool).mockResolvedValue('{"success": true, "data": []}');

      await analyticsQueryCommand({ sql: 'SELECT COUNT(*) FROM analytics_data' });

      expect(callTool).toHaveBeenCalledWith('paas.mcp.atxp.ai', 'query_analytics', {
        sql: 'SELECT COUNT(*) FROM analytics_data',
      });
    });

    it('should pass time range option', async () => {
      vi.mocked(callTool).mockResolvedValue('{"success": true, "data": []}');

      await analyticsQueryCommand({
        sql: 'SELECT COUNT(*) FROM analytics_data',
        range: '7d',
      });

      expect(callTool).toHaveBeenCalledWith('paas.mcp.atxp.ai', 'query_analytics', {
        sql: 'SELECT COUNT(*) FROM analytics_data',
        time_range: '7d',
      });
    });

    it('should exit with error when sql is missing', async () => {
      await expect(analyticsQueryCommand({})).rejects.toThrow('process.exit called');
      expect(console.error).toHaveBeenCalled();
    });

    it('should exit with error for invalid time range', async () => {
      await expect(
        analyticsQueryCommand({
          sql: 'SELECT * FROM analytics_data',
          range: 'invalid',
        })
      ).rejects.toThrow('process.exit called');
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('analyticsEventsCommand', () => {
    it('should list analytics events', async () => {
      vi.mocked(callTool).mockResolvedValue('{"success": true, "events": []}');

      await analyticsEventsCommand({});

      expect(callTool).toHaveBeenCalledWith('paas.mcp.atxp.ai', 'list_analytics_events', {});
    });

    it('should filter by event name', async () => {
      vi.mocked(callTool).mockResolvedValue('{"success": true, "events": []}');

      await analyticsEventsCommand({ event: 'page_view' });

      expect(callTool).toHaveBeenCalledWith('paas.mcp.atxp.ai', 'list_analytics_events', {
        event_name: 'page_view',
      });
    });

    it('should pass limit and time range options', async () => {
      vi.mocked(callTool).mockResolvedValue('{"success": true, "events": []}');

      await analyticsEventsCommand({
        limit: 50,
        range: '24h',
      });

      expect(callTool).toHaveBeenCalledWith('paas.mcp.atxp.ai', 'list_analytics_events', {
        limit: 50,
        time_range: '24h',
      });
    });

    it('should exit with error for invalid time range', async () => {
      await expect(analyticsEventsCommand({ range: 'invalid' })).rejects.toThrow(
        'process.exit called'
      );
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('analyticsStatsCommand', () => {
    it('should get analytics stats', async () => {
      vi.mocked(callTool).mockResolvedValue('{"success": true, "stats": []}');

      await analyticsStatsCommand({});

      expect(callTool).toHaveBeenCalledWith('paas.mcp.atxp.ai', 'get_analytics_stats', {});
    });

    it('should pass group by option', async () => {
      vi.mocked(callTool).mockResolvedValue('{"success": true, "stats": []}');

      await analyticsStatsCommand({ groupBy: 'hour' });

      expect(callTool).toHaveBeenCalledWith('paas.mcp.atxp.ai', 'get_analytics_stats', {
        group_by: 'hour',
      });
    });

    it('should pass time range option', async () => {
      vi.mocked(callTool).mockResolvedValue('{"success": true, "stats": []}');

      await analyticsStatsCommand({ range: '30d' });

      expect(callTool).toHaveBeenCalledWith('paas.mcp.atxp.ai', 'get_analytics_stats', {
        time_range: '30d',
      });
    });

    it('should exit with error for invalid group by value', async () => {
      await expect(analyticsStatsCommand({ groupBy: 'invalid' })).rejects.toThrow(
        'process.exit called'
      );
      expect(console.error).toHaveBeenCalled();
    });

    it('should exit with error for invalid time range', async () => {
      await expect(analyticsStatsCommand({ range: 'invalid' })).rejects.toThrow(
        'process.exit called'
      );
      expect(console.error).toHaveBeenCalled();
    });
  });
});
