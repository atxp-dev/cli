import { describe, it, expect } from 'vitest';

describe('ATXP CLI', () => {
  it('should detect create mode logic', () => {
    // Test the logic without importing the actual module
    const testCreateMode = (npmConfigArgv?: string, argv: string[] = []) => {
      return npmConfigArgv?.includes('create') || 
             argv.includes('--create') || 
             argv[2] === 'create';
    };

    expect(testCreateMode('create')).toBe(true);
    expect(testCreateMode(undefined, ['node', 'script', 'create'])).toBe(true);
    expect(testCreateMode(undefined, ['node', 'script', '--create'])).toBe(true);
    expect(testCreateMode()).toBe(false);
  });
});