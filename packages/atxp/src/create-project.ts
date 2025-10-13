import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { spawn } from 'child_process';
import inquirer from 'inquirer';

export type Framework = 'express' | 'cloudflare';

// Utility function to check if git is available
async function isGitAvailable(): Promise<boolean> {
  try {
    const { execSync } = await import('child_process');
    execSync('git --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Parse environment variables from .env content
export function parseEnvFile(content: string): Array<{ key: string; value: string; comment?: string }> {
  const lines = content.split('\n');
  const envVars: Array<{ key: string; value: string; comment?: string }> = [];
  let pendingComment: string | undefined;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines
    if (!trimmed) {
      pendingComment = undefined;
      continue;
    }
    
    // Capture comments
    if (trimmed.startsWith('#')) {
      // Extract comment text, removing the # and any extra spaces/trailing ###
      const commentText = trimmed.replace(/^#+\s*/, '').replace(/\s*#+\s*$/, '').trim();
      if (commentText) {
        pendingComment = commentText;
      }
      continue;
    }
    
    // Look for key=value pairs
    const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      
      // Check if the value looks like a placeholder
      const isPlaceholder = value === '' || 
                           value.includes('your_') || 
                           value.includes('YOUR_') || 
                           value.includes('<') || 
                           value.includes('TODO') ||
                           value.includes('REPLACE') ||
                           value === 'changeme' ||
                           (value.startsWith('"') && value.endsWith('"') && 
                            (value.includes('your_') || value.includes('YOUR_') || value === '""'));
      
      if (isPlaceholder) {
        envVars.push({ 
          key, 
          value, 
          comment: pendingComment || `Configuration value for ${key}`
        });
      }
      
      // Reset pending comment after processing a variable
      pendingComment = undefined;
    }
  }
  
  return envVars;
}

// Interactive environment variable configuration
async function configureEnvironmentVariables(envPath: string): Promise<void> {
  const envContent = await fs.readFile(envPath, 'utf-8');
  const envVars = parseEnvFile(envContent);
  
  if (envVars.length === 0) {
    console.log(chalk.green('Environment file looks good - no configuration needed'));
    return;
  }
  
  console.log(chalk.blue('\n🔧 Environment Configuration'));
  console.log(chalk.gray('The template includes environment variables that need configuration.'));
  
  const { shouldConfigure } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'shouldConfigure',
      message: 'Would you like to configure environment variables now?',
      default: true
    }
  ]);
  
  if (!shouldConfigure) {
    console.log(chalk.yellow('Skipped environment configuration. Remember to update your .env file before running the project!'));
    return;
  }
  
  console.log(chalk.gray('You can skip any variable by pressing Enter to keep the placeholder.\n'));
  console.log(chalk.gray('Clear the default text to set a variable to empty.\n'));
  
  const updatedVars: Record<string, string> = {};
  
  for (const envVar of envVars) {
    const { value } = await inquirer.prompt([
      {
        type: 'input',
        name: 'value',
        message: `${envVar.key} (${envVar.comment}):`,
        default: envVar.value
      }
    ]);
    
    // Use the value as-is. If user cleared the input, value will be empty string
    updatedVars[envVar.key] = value;
  }
  
  // Update the .env file with new values
  let updatedContent = envContent;
  for (const [key, value] of Object.entries(updatedVars)) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    updatedContent = updatedContent.replace(regex, `${key}=${value}`);
  }
  
  await fs.writeFile(envPath, updatedContent);
  console.log(chalk.green('✅ Environment variables configured successfully!'));
}

interface PackageJson {
  name: string;
  [key: string]: unknown;
}

// Template repositories
const TEMPLATES: Record<Framework, { url: string; humanText: string }> = {
  express: {
    url: 'https://github.com/atxp-dev/atxp-express-starter.git',
    humanText: 'Express (Express.js starter template)'
  },
  cloudflare: {
    url: 'https://github.com/atxp-dev/atxp-cloudflare-chat-template',
    humanText: 'Cloudflare (Cloudflare Chat agent with ATXP integration)'
  }
  // Future frameworks can be added here
  // vercel: {
  //   url: 'https://github.com/atxp-dev/atxp-vercel-starter.git',
  //   humanText: 'Vercel (Vercel.js starter template)'
  // }
};

// Find env.example file in project directory or one level of subdirectories
async function findEnvExample(projectPath: string): Promise<string | null> {
  // Check root directory first
  const rootEnvExample = path.join(projectPath, 'env.example');
  if (await fs.pathExists(rootEnvExample)) {
    return rootEnvExample;
  }

  // Check subdirectories (max depth 1)
  try {
    const entries = await fs.readdir(projectPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const subDirEnvExample = path.join(projectPath, entry.name, 'env.example');
        if (await fs.pathExists(subDirEnvExample)) {
          return subDirEnvExample;
        }
      }
    }
  } catch {
    // If we can't read the directory, just return null
    console.warn(chalk.yellow('Could not search for env.example files'));
  }

  return null;
}

export async function createProject(appName: string, framework: Framework, gitOption?: 'git' | 'no-git'): Promise<void> {
  try {
    // Validate app name
    if (!appName.trim()) {
      console.error(chalk.red('Project name is required'));
      process.exit(1);
    }
    if (!/^[a-zA-Z0-9-_]+$/.test(appName)) {
      console.error(chalk.red('Project name can only contain letters, numbers, hyphens, and underscores'));
      process.exit(1);
    }

    // Determine git initialization preference
    let initGit: boolean;
    if (gitOption === 'git') {
      initGit = true;
    } else if (gitOption === 'no-git') {
      initGit = false;
    } else {
      // Smart default: use git if available
      initGit = await isGitAvailable();
      if (initGit) {
        console.log(chalk.blue('Git detected - will initialize git repository (use --no-git to skip)'));
      } else {
        console.log(chalk.yellow('Git not found - skipping git initialization (install git or use --git to force)'));
      }
    }
    const projectPath = path.resolve(process.cwd(), appName);

    // Check if directory already exists
    if (await fs.pathExists(projectPath)) {
      console.error(chalk.red(`Directory "${appName}" already exists`));
      process.exit(1);
    }

    console.log(chalk.blue(`Creating project at ${projectPath}`));

    // Create project directory
    await fs.ensureDir(projectPath);

    // Clone template from GitHub
    await cloneTemplate(framework, projectPath);

    // Copy .env file from env.example if it exists and configure it interactively
    // Search for env.example in project root and one level of subdirectories
    const envExamplePath = await findEnvExample(projectPath);
    let createdEnvPath: string | null = null;

    if (envExamplePath) {
      const envDir = path.dirname(envExamplePath);
      const envPath = path.join(envDir, '.env');

      await fs.copy(envExamplePath, envPath);
      console.log(chalk.green('Environment file created from template'));

      // Configure environment variables interactively
      await configureEnvironmentVariables(envPath);

      createdEnvPath = envPath;
    }

    // Update package.json with project name
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (await fs.pathExists(packageJsonPath)) {
      const packageJson = await fs.readJson(packageJsonPath) as PackageJson;
      packageJson.name = appName;
      await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
    }

    // Remove .git directory from template (if it exists)
    const gitDir = path.join(projectPath, '.git');
    if (await fs.pathExists(gitDir)) {
      await fs.remove(gitDir);
    }

    // Initialize git if requested
    if (initGit) {
      const { execSync } = await import('child_process');
      try {
        execSync('git init', { cwd: projectPath, stdio: 'ignore' });
        console.log(chalk.green('Git repository initialized'));
      } catch {
        console.log(chalk.yellow('Could not initialize git repository'));
      }
    }

    console.log(chalk.green('\nProject created successfully!'));
    console.log(chalk.blue('\nNext steps:'));
    console.log(chalk.white(`  cd ${appName}`));

    // Different installation instructions based on framework
    if (framework === 'express') {
      console.log(chalk.white('  npm run install-all'));
    } else {
      console.log(chalk.white('  npm install'));
    }

    console.log(chalk.white('  npm start'));

    // Only show env reminder if there is an .env file that exists
    if (createdEnvPath && await fs.pathExists(createdEnvPath)) {
      console.log(chalk.yellow('\nRemember to configure your environment variables in the .env file!'));
    }

  } catch (error) {
    console.error(chalk.red('Error creating project:'), (error as Error).message);
    process.exit(1);
  }
}

async function cloneTemplate(framework: Framework, projectPath: string): Promise<void> {
  const templateConfig = TEMPLATES[framework];

  return new Promise((resolve, reject) => {
    console.log(chalk.blue('Downloading template from GitHub...'));
    
    const git = spawn('git', [
      'clone',
      '--depth', '1',           // Shallow clone - only latest commit  
      '--single-branch',        // Only clone the default branch
      '--branch', 'main',       // Explicitly target main branch
      templateConfig.url, 
      projectPath
    ], {
      stdio: 'inherit'
    });

    git.on('close', (code: number) => {
      if (code === 0) {
        console.log(chalk.green('Template downloaded successfully'));
        resolve();
      } else {
        reject(new Error(`Git clone failed with code ${code}`));
      }
    });

    git.on('error', (_error: Error) => {
      reject(new Error(`Failed to clone template`));
    });
  });
}

