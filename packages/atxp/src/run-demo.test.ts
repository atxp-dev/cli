import { describe, it, expect } from 'vitest';

describe('runDemo', () => {
  it('should parse command line flags correctly', () => {
    const parseFlags = (argv: string[]) => {
      return {
        isVerbose: argv.includes('--verbose') || argv.includes('-v'),
        shouldRefresh: argv.includes('--refresh')
      };
    };

    expect(parseFlags(['node', 'script'])).toEqual({ isVerbose: false, shouldRefresh: false });
    expect(parseFlags(['node', 'script', '--verbose'])).toEqual({ isVerbose: true, shouldRefresh: false });
    expect(parseFlags(['node', 'script', '-v'])).toEqual({ isVerbose: true, shouldRefresh: false });
    expect(parseFlags(['node', 'script', '--refresh'])).toEqual({ isVerbose: false, shouldRefresh: true });
    expect(parseFlags(['node', 'script', '--verbose', '--refresh'])).toEqual({ isVerbose: true, shouldRefresh: true });
  });
});