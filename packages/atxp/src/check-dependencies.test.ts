import { describe, it, expect } from 'vitest';
import { checkDependency } from './check-dependencies.js';

describe('checkDependency', () => {
  it('should return true for available commands', async () => {
    const nodeDependency = {
      name: 'Node.js',
      command: 'node',
      args: ['--version'],
      requiredFor: ['demo'],
      installInstructions: 'Please install Node.js'
    };
    
    const result = await checkDependency(nodeDependency);
    expect(result).toBe(true);
  });

  it('should return false for unavailable commands', async () => {
    const fakeDependency = {
      name: 'Fake Command',
      command: 'nonexistent-command-12345',
      args: ['--version'],
      requiredFor: ['demo'],
      installInstructions: 'This command does not exist'
    };
    
    const result = await checkDependency(fakeDependency);
    expect(result).toBe(false);
  });
});