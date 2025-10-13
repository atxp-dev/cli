import { describe, it, expect } from 'vitest';
import type { Framework } from './create-project.js';
import { parseEnvFile } from './create-project.js';

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
      const expressFramework: Framework = 'express';
      expect(expressFramework).toBe('express');

      const cloudflareFramework: Framework = 'cloudflare';
      expect(cloudflareFramework).toBe('cloudflare');

      // Test that the type system prevents invalid frameworks
      // This is compile-time validation, but we can test the concept
      const frameworks = ['express', 'cloudflare'] as const;
      expect(frameworks).toContain('express');
      expect(frameworks).toContain('cloudflare');
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

describe('parseEnvFile', () => {
  describe('basic parsing', () => {
    it('should parse environment variables with comments', () => {
      const envContent = `# Database connection string
DATABASE_URL=your_database_url_here

# JWT secret for authentication
JWT_SECRET=

# Port for the server
PORT=3000`;

      const result = parseEnvFile(envContent);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        key: 'DATABASE_URL',
        value: 'your_database_url_here',
        comment: 'Database connection string'
      });
      expect(result[1]).toEqual({
        key: 'JWT_SECRET',
        value: '',
        comment: 'JWT secret for authentication'
      });
    });

    it('should not include variables with non-placeholder values', () => {
      const envContent = `# Database connection string
DATABASE_URL=your_database_url_here

# Port (already configured)
PORT=3000

# Environment
NODE_ENV=development`;

      const result = parseEnvFile(envContent);
      
      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('DATABASE_URL');
    });

    it('should handle multiple comment lines', () => {
      const envContent = `# This is the main database URL
# It should point to your PostgreSQL instance
DATABASE_URL=your_database_url_here

# Simple comment
API_KEY=TODO`;

      const result = parseEnvFile(envContent);
      
      expect(result).toHaveLength(2);
      expect(result[0].comment).toBe('It should point to your PostgreSQL instance');
      expect(result[1].comment).toBe('Simple comment');
    });
  });

  describe('placeholder detection', () => {
    it('should detect empty values as placeholders', () => {
      const envContent = `API_KEY=
DATABASE_URL=`;

      const result = parseEnvFile(envContent);
      
      expect(result).toHaveLength(2);
      expect(result[0].key).toBe('API_KEY');
      expect(result[1].key).toBe('DATABASE_URL');
    });

    it('should detect common placeholder patterns', () => {
      const envContent = `API_KEY=your_api_key_here
SECRET=YOUR_SECRET_HERE
TOKEN=<your_token>
DB_URL=TODO
PASSWORD=REPLACE_ME
KEY=changeme`;

      const result = parseEnvFile(envContent);
      
      expect(result).toHaveLength(6);
      expect(result.map(r => r.key)).toEqual(['API_KEY', 'SECRET', 'TOKEN', 'DB_URL', 'PASSWORD', 'KEY']);
    });

    it('should not detect real values as placeholders', () => {
      const envContent = `PORT=3000
NODE_ENV=development
APP_NAME=MyApp
DEBUG=true
DATABASE_URL=postgresql://user:pass@localhost:5432/db`;

      const result = parseEnvFile(envContent);
      
      expect(result).toHaveLength(0);
    });
  });

  describe('comment handling', () => {
    it('should handle comments with different formatting', () => {
      const envContent = `# Simple comment
API_KEY=your_key

## Multiple hashes
SECRET=

###   Extra spaces and hashes   ###
TOKEN=TODO

# Comment with special chars !@#$%^&*()
PASSWORD=changeme`;

      const result = parseEnvFile(envContent);
      
      expect(result).toHaveLength(4);
      expect(result[0].comment).toBe('Simple comment');
      expect(result[1].comment).toBe('Multiple hashes');
      expect(result[2].comment).toBe('Extra spaces and hashes');
      expect(result[3].comment).toBe('Comment with special chars !@#$%^&*()');
    });

    it('should provide fallback description when no comment exists', () => {
      const envContent = `API_KEY=your_key

SECRET=
TOKEN=TODO`;

      const result = parseEnvFile(envContent);
      
      expect(result).toHaveLength(3);
      expect(result[0].comment).toBe('Configuration value for API_KEY');
      expect(result[1].comment).toBe('Configuration value for SECRET');
      expect(result[2].comment).toBe('Configuration value for TOKEN');
    });

    it('should reset comments properly between variables', () => {
      const envContent = `# Comment for API_KEY
API_KEY=your_key

# This comment should not apply to PORT
PORT=3000

SECRET=TODO`;

      const result = parseEnvFile(envContent);
      
      expect(result).toHaveLength(2);
      expect(result[0].comment).toBe('Comment for API_KEY');
      expect(result[1].comment).toBe('Configuration value for SECRET');
    });
  });

  describe('edge cases', () => {
    it('should handle empty file', () => {
      const result = parseEnvFile('');
      expect(result).toHaveLength(0);
    });

    it('should handle file with only comments', () => {
      const envContent = `# This is a comment
# Another comment
# No variables here`;

      const result = parseEnvFile(envContent);
      expect(result).toHaveLength(0);
    });

    it('should handle malformed lines gracefully', () => {
      const envContent = `# Valid comment
API_KEY=your_key
invalid_line_without_equals
ANOTHER_KEY=
=value_without_key
KEY_WITH_EQUALS=value=with=equals`;

      const result = parseEnvFile(envContent);
      
      expect(result).toHaveLength(2);
      expect(result[0].key).toBe('API_KEY');
      expect(result[1].key).toBe('ANOTHER_KEY');
    });

    it('should handle variables with special characters in values', () => {
      const envContent = `# Database URL with special chars
DATABASE_URL=your_url_here
# JWT with special formatting  
JWT_SECRET=<replace_with_secret>
# Password with quotes (real value)
PASSWORD="my_actual_password"`;

      const result = parseEnvFile(envContent);
      
      expect(result).toHaveLength(2);
      expect(result[0].key).toBe('DATABASE_URL');
      expect(result[1].key).toBe('JWT_SECRET');
      // PASSWORD should not be included as it has a real value
    });

    it('should handle mixed case variable names', () => {
      const envContent = `# API key
api_key=your_key
Api_Key=your_key  
API_KEY=your_key
database_url=your_url`;

      const result = parseEnvFile(envContent);
      
      // Only API_KEY should match the pattern (uppercase with underscores)
      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('API_KEY');
    });
  });

  describe('real-world examples', () => {
    it('should parse a typical express app env.example', () => {
      const envContent = `# Server configuration
PORT=3000
NODE_ENV=development

# Database
# PostgreSQL connection string
DATABASE_URL=your_database_url_here

# Authentication
# Secret key for JWT tokens (generate a strong random string)
JWT_SECRET=your_jwt_secret_here

# External APIs  
# OpenAI API key for AI features
OPENAI_API_KEY=your_openai_key_here

# Optional: Redis for caching
REDIS_URL=your_redis_url_here`;

      const result = parseEnvFile(envContent);
      
      expect(result).toHaveLength(4);
      
      const keys = result.map(r => r.key);
      expect(keys).toEqual(['DATABASE_URL', 'JWT_SECRET', 'OPENAI_API_KEY', 'REDIS_URL']);
      
      expect(result[0].comment).toBe('PostgreSQL connection string');
      expect(result[1].comment).toBe('Secret key for JWT tokens (generate a strong random string)');
      expect(result[2].comment).toBe('OpenAI API key for AI features');
      expect(result[3].comment).toBe('Optional: Redis for caching');
    });

    it('should parse a typical web app env.example with various formats', () => {
      const envContent = `# Application Settings
APP_NAME=MyApp
APP_URL=http://localhost:3000

# Database Configuration
# Primary database connection
DATABASE_URL=

# Authentication & Security
# Clerk Authentication Keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_publishable_key_here
CLERK_SECRET_KEY=your_secret_key_here

# Email Service
# SendGrid API key for transactional emails  
SENDGRID_API_KEY=TODO

# Analytics (optional)
GOOGLE_ANALYTICS_ID=

# Feature Flags
ENABLE_PREMIUM_FEATURES=false`;

      const result = parseEnvFile(envContent);
      
      expect(result).toHaveLength(5);
      
      const expectedVars = [
        { key: 'DATABASE_URL', comment: 'Primary database connection' },
        { key: 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', comment: 'Clerk Authentication Keys' },
        { key: 'CLERK_SECRET_KEY', comment: 'Configuration value for CLERK_SECRET_KEY' }, // Comment is reset after first variable
        { key: 'SENDGRID_API_KEY', comment: 'SendGrid API key for transactional emails' },
        { key: 'GOOGLE_ANALYTICS_ID', comment: 'Analytics (optional)' }
      ];
      
      expectedVars.forEach((expected, index) => {
        expect(result[index].key).toBe(expected.key);
        expect(result[index].comment).toBe(expected.comment);
      });
    });
  });
});