import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the call-tool module
vi.mock('../../call-tool.js', () => ({
  callTool: vi.fn(),
}));

import { callTool } from '../../call-tool.js';
import {
  dnsAddCommand,
  dnsListCommand,
  dnsRecordCreateCommand,
  dnsRecordListCommand,
  dnsRecordDeleteCommand,
  dnsConnectCommand,
} from './dns.js';

describe('DNS Commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
  });

  describe('dnsAddCommand', () => {
    it('should add a domain', async () => {
      vi.mocked(callTool).mockResolvedValue('{"success": true}');

      await dnsAddCommand('example.com');

      expect(callTool).toHaveBeenCalledWith('paas.mcp.atxp.ai', 'add_domain', {
        domain: 'example.com',
      });
    });
  });

  describe('dnsListCommand', () => {
    it('should list all domains', async () => {
      vi.mocked(callTool).mockResolvedValue('{"success": true, "domains": []}');

      await dnsListCommand();

      expect(callTool).toHaveBeenCalledWith('paas.mcp.atxp.ai', 'list_domains', {});
    });
  });

  describe('dnsRecordCreateCommand', () => {
    it('should create an A record', async () => {
      vi.mocked(callTool).mockResolvedValue('{"success": true}');

      await dnsRecordCreateCommand('example.com', {
        type: 'A',
        name: 'www',
        content: '192.168.1.1',
      });

      expect(callTool).toHaveBeenCalledWith('paas.mcp.atxp.ai', 'create_dns_record', {
        domain: 'example.com',
        type: 'A',
        name: 'www',
        content: '192.168.1.1',
      });
    });

    it('should create a CNAME record with optional fields', async () => {
      vi.mocked(callTool).mockResolvedValue('{"success": true}');

      await dnsRecordCreateCommand('example.com', {
        type: 'CNAME',
        name: 'blog',
        content: 'example.com',
        ttl: 3600,
        proxied: true,
      });

      expect(callTool).toHaveBeenCalledWith('paas.mcp.atxp.ai', 'create_dns_record', {
        domain: 'example.com',
        type: 'CNAME',
        name: 'blog',
        content: 'example.com',
        ttl: 3600,
        proxied: true,
      });
    });

    it('should create an MX record with priority', async () => {
      vi.mocked(callTool).mockResolvedValue('{"success": true}');

      await dnsRecordCreateCommand('example.com', {
        type: 'MX',
        name: '@',
        content: 'mail.example.com',
        priority: 10,
      });

      expect(callTool).toHaveBeenCalledWith('paas.mcp.atxp.ai', 'create_dns_record', {
        domain: 'example.com',
        type: 'MX',
        name: '@',
        content: 'mail.example.com',
        priority: 10,
      });
    });

    it('should normalize record type to uppercase', async () => {
      vi.mocked(callTool).mockResolvedValue('{"success": true}');

      await dnsRecordCreateCommand('example.com', {
        type: 'txt',
        name: '@',
        content: 'v=spf1 include:_spf.example.com ~all',
      });

      expect(callTool).toHaveBeenCalledWith('paas.mcp.atxp.ai', 'create_dns_record', {
        domain: 'example.com',
        type: 'TXT',
        name: '@',
        content: 'v=spf1 include:_spf.example.com ~all',
      });
    });

    it('should exit with error when type is missing', async () => {
      await expect(
        dnsRecordCreateCommand('example.com', { name: 'www', content: '1.2.3.4' })
      ).rejects.toThrow('process.exit called');
      expect(console.error).toHaveBeenCalled();
    });

    it('should exit with error when name is missing', async () => {
      await expect(
        dnsRecordCreateCommand('example.com', { type: 'A', content: '1.2.3.4' })
      ).rejects.toThrow('process.exit called');
      expect(console.error).toHaveBeenCalled();
    });

    it('should exit with error when content is missing', async () => {
      await expect(
        dnsRecordCreateCommand('example.com', { type: 'A', name: 'www' })
      ).rejects.toThrow('process.exit called');
      expect(console.error).toHaveBeenCalled();
    });

    it('should exit with error for invalid record type', async () => {
      await expect(
        dnsRecordCreateCommand('example.com', {
          type: 'INVALID',
          name: 'www',
          content: '1.2.3.4',
        })
      ).rejects.toThrow('process.exit called');
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('dnsRecordListCommand', () => {
    it('should list all DNS records', async () => {
      vi.mocked(callTool).mockResolvedValue('{"success": true, "records": []}');

      await dnsRecordListCommand('example.com', {});

      expect(callTool).toHaveBeenCalledWith('paas.mcp.atxp.ai', 'list_dns_records', {
        domain: 'example.com',
      });
    });

    it('should filter by record type', async () => {
      vi.mocked(callTool).mockResolvedValue('{"success": true, "records": []}');

      await dnsRecordListCommand('example.com', { type: 'a' });

      expect(callTool).toHaveBeenCalledWith('paas.mcp.atxp.ai', 'list_dns_records', {
        domain: 'example.com',
        type: 'A',
      });
    });
  });

  describe('dnsRecordDeleteCommand', () => {
    it('should delete a DNS record', async () => {
      vi.mocked(callTool).mockResolvedValue('{"success": true}');

      await dnsRecordDeleteCommand('example.com', 'record-123');

      expect(callTool).toHaveBeenCalledWith('paas.mcp.atxp.ai', 'delete_dns_record', {
        domain: 'example.com',
        record_id: 'record-123',
      });
    });
  });

  describe('dnsConnectCommand', () => {
    it('should connect a domain to a worker', async () => {
      vi.mocked(callTool).mockResolvedValue('{"success": true}');

      await dnsConnectCommand('example.com', 'my-worker', {});

      expect(callTool).toHaveBeenCalledWith('paas.mcp.atxp.ai', 'connect_domain_to_worker', {
        domain: 'example.com',
        worker_name: 'my-worker',
      });
    });

    it('should connect with subdomain', async () => {
      vi.mocked(callTool).mockResolvedValue('{"success": true}');

      await dnsConnectCommand('example.com', 'my-api', { subdomain: 'api' });

      expect(callTool).toHaveBeenCalledWith('paas.mcp.atxp.ai', 'connect_domain_to_worker', {
        domain: 'example.com',
        worker_name: 'my-api',
        subdomain: 'api',
      });
    });
  });
});
