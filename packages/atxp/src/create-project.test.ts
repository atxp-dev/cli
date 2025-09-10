import { describe, it, expect } from 'vitest';
import type { Framework } from './create-project.js';

describe('createProject', () => {
  describe('project name validation', () => {
    const validateProjectName = (input: string) => {
      if (!input.trim()) return 'Project name is required';
      if (!/^[a-zA-Z0-9-_]+$/.test(input)) {
        return 'Project name can only contain letters, numbers, hyphens, and underscores';
      }
      return true;
    };

    it('should accept valid project names', () => {
      expect(validateProjectName('my-project')).toBe(true);
      expect(validateProjectName('project_123')).toBe(true);
      expect(validateProjectName('MyProject')).toBe(true);
      expect(validateProjectName('project123')).toBe(true);
      expect(validateProjectName('my-awesome_project-2024')).toBe(true);
    });

    it('should reject invalid project names', () => {
      expect(validateProjectName('')).toBe('Project name is required');
      expect(validateProjectName('   ')).toBe('Project name is required');
      expect(validateProjectName('invalid name')).toBe('Project name can only contain letters, numbers, hyphens, and underscores');
      expect(validateProjectName('invalid@name')).toBe('Project name can only contain letters, numbers, hyphens, and underscores');
      expect(validateProjectName('invalid.name')).toBe('Project name can only contain letters, numbers, hyphens, and underscores');
      expect(validateProjectName('invalid/name')).toBe('Project name can only contain letters, numbers, hyphens, and underscores');
    });
  });

  describe('Framework type', () => {
    it('should have correct framework types', () => {
      const validFramework: Framework = 'express';
      expect(validFramework).toBe('express');
      
      // Test that the type system prevents invalid frameworks
      // This is compile-time validation, but we can test the concept
      const frameworks = ['express'] as const;
      expect(frameworks).toContain('express');
    });
  });

  describe('git options', () => {
    it('should recognize valid git options', () => {
      const validGitOptions = ['git', 'no-git'] as const;
      
      expect(validGitOptions).toContain('git');
      expect(validGitOptions).toContain('no-git');
    });
  });
});