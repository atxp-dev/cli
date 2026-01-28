import fs from 'fs';
import path from 'path';
import os from 'os';
import type { OAuthDb, ClientCredentials, PKCEValues, AccessToken } from '@atxp/common';
import { CONFIG_DIR } from './config.js';

export const OAUTH_CACHE_FILE = path.join(CONFIG_DIR, 'oauth-cache.json');

interface OAuthCache {
  clientCredentials: Record<string, ClientCredentials>;
  pkceValues: Record<string, PKCEValues>;
  accessTokens: Record<string, AccessToken>;
}

export class FileOAuthDb implements OAuthDb {
  private cacheFile: string;

  constructor(cacheFile: string = OAUTH_CACHE_FILE) {
    this.cacheFile = cacheFile;
  }

  private loadCache(): OAuthCache {
    try {
      if (fs.existsSync(this.cacheFile)) {
        const content = fs.readFileSync(this.cacheFile, 'utf-8');
        return JSON.parse(content) as OAuthCache;
      }
    } catch {
      // Ignore read/parse errors, start fresh
    }
    return {
      clientCredentials: {},
      pkceValues: {},
      accessTokens: {},
    };
  }

  private saveCache(cache: OAuthCache): void {
    const dir = path.dirname(this.cacheFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.cacheFile, JSON.stringify(cache, null, 2), { mode: 0o600 });
  }

  async getClientCredentials(serverUrl: string): Promise<ClientCredentials | null> {
    const cache = this.loadCache();
    return cache.clientCredentials[serverUrl] || null;
  }

  async saveClientCredentials(serverUrl: string, credentials: ClientCredentials): Promise<void> {
    const cache = this.loadCache();
    cache.clientCredentials[serverUrl] = credentials;
    this.saveCache(cache);
  }

  async getPKCEValues(userId: string, state: string): Promise<PKCEValues | null> {
    const key = `${userId}:${state}`;
    const cache = this.loadCache();
    return cache.pkceValues[key] || null;
  }

  async savePKCEValues(userId: string, state: string, values: PKCEValues): Promise<void> {
    const key = `${userId}:${state}`;
    const cache = this.loadCache();
    cache.pkceValues[key] = values;
    this.saveCache(cache);
  }

  async getAccessToken(userId: string, url: string): Promise<AccessToken | null> {
    const key = `${userId}:${url}`;
    const cache = this.loadCache();
    const token = cache.accessTokens[key];

    if (!token) {
      return null;
    }

    // Check if token has expired
    if (token.expiresAt && token.expiresAt < Date.now()) {
      // Remove expired token from cache
      delete cache.accessTokens[key];
      this.saveCache(cache);
      return null;
    }

    return token;
  }

  async saveAccessToken(userId: string, url: string, token: AccessToken): Promise<void> {
    const key = `${userId}:${url}`;
    const cache = this.loadCache();
    cache.accessTokens[key] = token;
    this.saveCache(cache);
  }

  async close(): Promise<void> {
    // Nothing to close for file-based storage
  }
}
