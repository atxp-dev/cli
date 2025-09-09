import { spawn } from 'child_process';
import chalk from 'chalk';

interface DependencyCheck {
  name: string;
  command: string;
  args: string[];
  requiredFor: string[];
  installInstructions: string;
}

const DEPENDENCIES: DependencyCheck[] = [
  {
    name: 'Git',
    command: 'git',
    args: ['--version'],
    requiredFor: ['demo', 'create'],
    installInstructions: 'Please install Git from https://git-scm.com/downloads'
  },
  {
    name: 'npm',
    command: 'npm',
    args: ['--version'],
    requiredFor: ['demo'],
    installInstructions: 'Please install Node.js (which includes npm) from https://nodejs.org/'
  }
];

export async function checkDependency(dependency: DependencyCheck): Promise<boolean> {
  return new Promise((resolve) => {
    const process = spawn(dependency.command, dependency.args, {
      stdio: 'ignore'
    });

    process.on('close', (code) => {
      resolve(code === 0);
    });

    process.on('error', () => {
      resolve(false);
    });
  });
}

export async function checkAllDependencies(command?: string): Promise<boolean> {
  let allDependenciesOk = true;
  
  for (const dependency of DEPENDENCIES) {
    // If a specific command is provided, only check dependencies for that command
    if (command && !dependency.requiredFor.includes(command)) {
      continue;
    }

    const isAvailable = await checkDependency(dependency);
    
    if (!isAvailable) {
      console.error(chalk.red(`✗ ${dependency.name} is not installed or not available in PATH`));
      console.error(chalk.yellow(`  Required for: ${dependency.requiredFor.join(', ')}`));
      console.error(chalk.white(`  ${dependency.installInstructions}`));
      console.error('');
      allDependenciesOk = false;
    }
  }

  return allDependenciesOk;
}

export function showDependencyError(command: string): void {
  console.error(chalk.red(`Cannot run "${command}" command due to missing dependencies.`));
  console.error(chalk.yellow('Please install the required dependencies and try again.'));
  console.error('');
  console.error(chalk.white('For help with installation, visit:'));
  console.error(chalk.blue('  Git: https://git-scm.com/downloads'));
  console.error(chalk.blue('  Node.js/npm: https://nodejs.org/'));
}