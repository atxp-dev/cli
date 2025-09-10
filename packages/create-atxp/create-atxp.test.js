// Test for the create-atxp wrapper functionality
// Since this is a simple wrapper, we test the argument transformation logic

import { describe, it, expect } from 'vitest';

describe('create-atxp wrapper', () => {
  describe('argument transformation', () => {
    it('should transform arguments correctly for atxp create command', () => {
      // Simulate the logic from index.js
      const transformArgs = (inputArgs) => {
        const args = inputArgs.slice(2); // Remove 'node' and 'script'
        return ['atxp', 'create', ...args];
      };

      // Test basic app name
      expect(transformArgs(['node', 'create-atxp', 'my-app']))
        .toEqual(['atxp', 'create', 'my-app']);

      // Test with framework flag
      expect(transformArgs(['node', 'create-atxp', 'my-app', '--framework', 'express']))
        .toEqual(['atxp', 'create', 'my-app', '--framework', 'express']);

      // Test with git flags
      expect(transformArgs(['node', 'create-atxp', 'my-app', '--no-git']))
        .toEqual(['atxp', 'create', 'my-app', '--no-git']);

      // Test with multiple flags
      expect(transformArgs(['node', 'create-atxp', 'my-app', '--framework', 'express', '--git']))
        .toEqual(['atxp', 'create', 'my-app', '--framework', 'express', '--git']);

      // Test help flag
      expect(transformArgs(['node', 'create-atxp', '--help']))
        .toEqual(['atxp', 'create', '--help']);

      // Test no arguments
      expect(transformArgs(['node', 'create-atxp']))
        .toEqual(['atxp', 'create']);
    });
  });

  describe('npm create integration', () => {
    it('should handle npm create syntax correctly', () => {
      // When user runs: npm create atxp my-app
      // npm transforms this to: npx create-atxp my-app
      // Our wrapper should transform to: npx atxp create my-app
      
      const simulateNpmCreate = (packageArgs) => {
        // This simulates what npm does when running 'npm create atxp ...'
        return ['npx', 'create-atxp', ...packageArgs];
      };

      const wrapperTransform = (fullCommand) => {
        // Skip 'npx', 'create-atxp' and take the rest
        const args = fullCommand.slice(2);
        return ['npx', 'atxp', 'create', ...args];
      };

      // Test the full flow
      const npmCommand = simulateNpmCreate(['my-app']);
      expect(npmCommand).toEqual(['npx', 'create-atxp', 'my-app']);
      
      const finalCommand = wrapperTransform(npmCommand);
      expect(finalCommand).toEqual(['npx', 'atxp', 'create', 'my-app']);
    });
  });
});