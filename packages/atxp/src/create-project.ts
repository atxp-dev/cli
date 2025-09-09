import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { spawn } from 'child_process';

interface ProjectAnswers {
  projectName: string;
  template: 'agent';
  initGit: boolean;
}

interface PackageJson {
  name: string;
  [key: string]: unknown;
}

// Template repositories
const TEMPLATES = {
  agent: {
    url: 'https://github.com/atxp-dev/agent-demo.git',
    humanText: 'Agent Demo (Full-stack web agent)'
  }
};

export async function createProject(): Promise<void> {
  try {
    // Get project details from user
    const answers = await inquirer.prompt<ProjectAnswers>([
      {
        type: 'input',
        name: 'projectName',
        message: 'What is your project named?',
        default: 'my-atxp-app',
        validate: (input: string) => {
          if (!input.trim()) return 'Project name is required';
          if (!/^[a-zA-Z0-9-_]+$/.test(input)) {
            return 'Project name can only contain letters, numbers, hyphens, and underscores';
          }
          return true;
        }
      },
      {
        type: 'list',
        name: 'template',
        message: 'Choose a template:',
        choices: Object.entries(TEMPLATES).map(([key, template]) => ({
          name: template.humanText,
          value: key
        })),
        default: 'agent'
      },
      {
        type: 'confirm',
        name: 'initGit',
        message: 'Initialize git repository?',
        default: true
      }
    ]);

    const { projectName, template, initGit } = answers;
    const projectPath = path.resolve(process.cwd(), projectName);

    // Check if directory already exists
    if (await fs.pathExists(projectPath)) {
      console.error(chalk.red(`Directory "${projectName}" already exists`));
      process.exit(1);
    }

    console.log(chalk.blue(`Creating project at ${projectPath}`));

    // Create project directory
    await fs.ensureDir(projectPath);

    // Clone template from GitHub
    await cloneTemplate(template, projectPath);

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
      packageJson.name = projectName;
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
    console.log(chalk.white(`  cd ${projectName}`));
    console.log(chalk.white('  npm install'));
    console.log(chalk.white('  npm start'));
    console.log(chalk.yellow('\nRemember to configure your environment variables in the .env file!'));

  } catch (error) {
    console.error(chalk.red('Error creating project:'), (error as Error).message);
    process.exit(1);
  }
}

async function cloneTemplate(template: string, projectPath: string): Promise<void> {
  const templateConfig = TEMPLATES[template as keyof typeof TEMPLATES];
  
  if (!templateConfig) {
    throw new Error(`Template "${template}" not found`);
  }

  return new Promise((resolve, reject) => {
    console.log(chalk.blue('Downloading template from GitHub...'));
    
    const git = spawn('git', ['clone', templateConfig.url, projectPath], {
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

