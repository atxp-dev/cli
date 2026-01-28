import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Verbose Mode', () => {
  let originalArgv: string[];
  let originalDebug: string | undefined;

  beforeEach(() => {
    originalArgv = process.argv;
    originalDebug = process.env.DEBUG;
  });

  afterEach(() => {
    process.argv = originalArgv;
    if (originalDebug === undefined) {
      delete process.env.DEBUG;
    } else {
      process.env.DEBUG = originalDebug;
    }
  });

  describe('isVerboseMode', () => {
    it('should return true when --verbose flag is present', async () => {
      process.argv = ['node', 'atxp', 'search', '--verbose'];
      delete process.env.DEBUG;

      // Re-import to get fresh evaluation
      const { isVerboseMode } = await import('./verbose.js');
      expect(isVerboseMode()).toBe(true);
    });

    it('should return true when -v flag is present', async () => {
      process.argv = ['node', 'atxp', 'search', '-v'];
      delete process.env.DEBUG;

      const { isVerboseMode } = await import('./verbose.js');
      expect(isVerboseMode()).toBe(true);
    });

    it('should return true when DEBUG=atxp is set', async () => {
      process.argv = ['node', 'atxp', 'search'];
      process.env.DEBUG = 'atxp';

      const { isVerboseMode } = await import('./verbose.js');
      expect(isVerboseMode()).toBe(true);
    });

    it('should return true when DEBUG=1 is set', async () => {
      process.argv = ['node', 'atxp', 'search'];
      process.env.DEBUG = '1';

      const { isVerboseMode } = await import('./verbose.js');
      expect(isVerboseMode()).toBe(true);
    });

    it('should return true when DEBUG=true is set', async () => {
      process.argv = ['node', 'atxp', 'search'];
      process.env.DEBUG = 'true';

      const { isVerboseMode } = await import('./verbose.js');
      expect(isVerboseMode()).toBe(true);
    });

    it('should return true when DEBUG contains atxp', async () => {
      process.argv = ['node', 'atxp', 'search'];
      process.env.DEBUG = 'other,atxp,more';

      const { isVerboseMode } = await import('./verbose.js');
      expect(isVerboseMode()).toBe(true);
    });

    it('should return false when no verbose indicators are present', async () => {
      process.argv = ['node', 'atxp', 'search'];
      delete process.env.DEBUG;

      const { isVerboseMode } = await import('./verbose.js');
      expect(isVerboseMode()).toBe(false);
    });

    it('should return false when DEBUG is set to unrelated value', async () => {
      process.argv = ['node', 'atxp', 'search'];
      process.env.DEBUG = 'other';

      const { isVerboseMode } = await import('./verbose.js');
      expect(isVerboseMode()).toBe(false);
    });
  });

  describe('getCliLogger', () => {
    it('should return a ConsoleLogger instance', async () => {
      process.argv = ['node', 'atxp', 'search'];
      delete process.env.DEBUG;

      const { getCliLogger } = await import('./verbose.js');
      const logger = getCliLogger();

      expect(logger).toBeDefined();
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
    });
  });
});
