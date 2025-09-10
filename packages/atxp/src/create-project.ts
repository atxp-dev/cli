import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { spawn } from 'child_process';

export type Framework = 'express';

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

interface PackageJson {
  name: string;
  [key: string]: unknown;
}

// Template repositories
const TEMPLATES: Record<Framework, { url: string; humanText: string }> = {
  express: {
    url: 'https://github.com/atxp-dev/atxp-express-starter.git',
    humanText: 'Express (Express.js starter template)'
  }
  // Future frameworks can be added here
  // vercel: {
  //   url: 'https://github.com/atxp-dev/atxp-vercel-starter.git',
  //   humanText: 'Vercel (Vercel.js starter template)'
  // }
};

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

    // Copy .env file from env.example if it exists
    const envExamplePath = path.join(projectPath, 'env.example');
    const envPath = path.join(projectPath, '.env');
    if (await fs.pathExists(envExamplePath)) {
      await fs.copy(envExamplePath, envPath);
      console.log(chalk.green('Environment file created from template'));
    } else {
      console.log(chalk.yellow('No env.example found in template'));
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
    console.log(chalk.white('  npm install'));
    console.log(chalk.white('  npm start'));
    console.log(chalk.yellow('\nRemember to configure your environment variables in the .env file!'));

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

