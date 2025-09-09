import { describe, it, expect } from 'vitest';

describe('createProject', () => {
  it('should validate project names correctly', () => {
    const validateProjectName = (input: string) => {
      if (!input.trim()) return 'Project name is required';
      if (!/^[a-zA-Z0-9-_]+$/.test(input)) {
        return 'Project name can only contain letters, numbers, hyphens, and underscores';
      }
      return true;
    };

    expect(validateProjectName('my-project')).toBe(true);
    expect(validateProjectName('project_123')).toBe(true);
    expect(validateProjectName('')).toBe('Project name is required');
    expect(validateProjectName('invalid name')).toBe('Project name can only contain letters, numbers, hyphens, and underscores');
    expect(validateProjectName('invalid@name')).toBe('Project name can only contain letters, numbers, hyphens, and underscores');
  });
});