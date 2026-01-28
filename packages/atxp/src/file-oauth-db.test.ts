import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { FileOAuthDb } from './file-oauth-db.js';
import type { ClientCredentials, PKCEValues, AccessToken } from '@atxp/common';

describe('FileOAuthDb', () => {
  let testDir: string;
  let testCacheFile: string;
  let db: FileOAuthDb;

  beforeEach(() => {
    // Create a unique test directory for each test
    testDir = path.join(os.tmpdir(), `atxp-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    testCacheFile = path.join(testDir, 'oauth-cache.json');
    db = new FileOAuthDb(testCacheFile);
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  describe('file creation', () => {
    it('should create cache file with correct permissions (0o600)', async () => {
      const credentials: ClientCredentials = {
        clientId: 'test-client',
        clientSecret: 'test-secret',
        redirectUri: 'http://localhost/callback',
      };

      await db.saveClientCredentials('https://example.com', credentials);

      expect(fs.existsSync(testCacheFile)).toBe(true);

      const stats = fs.statSync(testCacheFile);
      // Check permissions (0o600 = owner read/write only)
      const permissions = stats.mode & 0o777;
      expect(permissions).toBe(0o600);
    });

    it('should create directory if it does not exist', async () => {
      expect(fs.existsSync(testDir)).toBe(false);

      await db.saveClientCredentials('https://example.com', {
        clientId: 'test',
        clientSecret: 'secret',
        redirectUri: 'http://localhost',
      });

      expect(fs.existsSync(testDir)).toBe(true);
      expect(fs.existsSync(testCacheFile)).toBe(true);
    });
  });

  describe('client credentials', () => {
    it('should store and retrieve client credentials', async () => {
      const serverUrl = 'https://api.example.com';
      const credentials: ClientCredentials = {
        clientId: 'my-client-id',
        clientSecret: 'my-client-secret',
        redirectUri: 'http://localhost:3000/callback',
      };

      await db.saveClientCredentials(serverUrl, credentials);
      const retrieved = await db.getClientCredentials(serverUrl);

      expect(retrieved).toEqual(credentials);
    });

    it('should return null for non-existent credentials', async () => {
      const result = await db.getClientCredentials('https://unknown.com');
      expect(result).toBeNull();
    });
  });

  describe('PKCE values', () => {
    it('should store and retrieve PKCE values', async () => {
      const userId = 'user-123';
      const state = 'random-state';
      const values: PKCEValues = {
        codeVerifier: 'code-verifier-xyz',
        codeChallenge: 'code-challenge-abc',
        resourceUrl: 'https://resource.example.com',
        url: 'https://auth.example.com/authorize',
      };

      await db.savePKCEValues(userId, state, values);
      const retrieved = await db.getPKCEValues(userId, state);

      expect(retrieved).toEqual(values);
    });

    it('should return null for non-existent PKCE values', async () => {
      const result = await db.getPKCEValues('unknown-user', 'unknown-state');
      expect(result).toBeNull();
    });
  });

  describe('access tokens', () => {
    it('should store and retrieve valid access tokens', async () => {
      const userId = 'user-456';
      const url = 'https://api.example.com';
      const token: AccessToken = {
        accessToken: 'access-token-xyz',
        refreshToken: 'refresh-token-abc',
        expiresAt: Date.now() + 3600000, // Expires in 1 hour
        resourceUrl: url,
      };

      await db.saveAccessToken(userId, url, token);
      const retrieved = await db.getAccessToken(userId, url);

      expect(retrieved).toEqual(token);
    });

    it('should return null for non-existent tokens', async () => {
      const result = await db.getAccessToken('unknown-user', 'https://unknown.com');
      expect(result).toBeNull();
    });

    it('should return null for expired tokens', async () => {
      const userId = 'user-789';
      const url = 'https://api.example.com';
      const expiredToken: AccessToken = {
        accessToken: 'expired-token',
        expiresAt: Date.now() - 1000, // Expired 1 second ago
        resourceUrl: url,
      };

      await db.saveAccessToken(userId, url, expiredToken);
      const retrieved = await db.getAccessToken(userId, url);

      expect(retrieved).toBeNull();
    });

    it('should remove expired token from cache', async () => {
      const userId = 'user-expired';
      const url = 'https://api.example.com';
      const expiredToken: AccessToken = {
        accessToken: 'expired-token',
        expiresAt: Date.now() - 1000,
        resourceUrl: url,
      };

      await db.saveAccessToken(userId, url, expiredToken);

      // First retrieval returns null and removes from cache
      await db.getAccessToken(userId, url);

      // Verify token is removed from the file
      const cacheContent = JSON.parse(fs.readFileSync(testCacheFile, 'utf-8'));
      expect(cacheContent.accessTokens[`${userId}:${url}`]).toBeUndefined();
    });

    it('should return tokens without expiresAt as valid', async () => {
      const userId = 'user-no-expiry';
      const url = 'https://api.example.com';
      const tokenNoExpiry: AccessToken = {
        accessToken: 'no-expiry-token',
        resourceUrl: url,
      };

      await db.saveAccessToken(userId, url, tokenNoExpiry);
      const retrieved = await db.getAccessToken(userId, url);

      expect(retrieved).toEqual(tokenNoExpiry);
    });
  });

  describe('cache persistence', () => {
    it('should persist data across instances', async () => {
      const serverUrl = 'https://persist-test.com';
      const credentials: ClientCredentials = {
        clientId: 'persist-client',
        clientSecret: 'persist-secret',
        redirectUri: 'http://localhost',
      };

      // Save with first instance
      await db.saveClientCredentials(serverUrl, credentials);

      // Create new instance with same cache file
      const db2 = new FileOAuthDb(testCacheFile);
      const retrieved = await db2.getClientCredentials(serverUrl);

      expect(retrieved).toEqual(credentials);
    });
  });

  describe('close', () => {
    it('should close without error', async () => {
      await expect(db.close()).resolves.toBeUndefined();
    });
  });
});
