import chalk from 'chalk';
import { spawn } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import open from 'open';
import os from 'os';

const DEMO_REPO_URL = 'https://github.com/atxp-dev/agent-demo.git';
const DEMO_DIR = path.join(os.homedir(), '.cache', 'atxp', 'demo');
const DEMO_PORT = 8016;

const isVerbose = process.argv.includes('--verbose') || process.argv.includes('-v');
const shouldRefresh = process.argv.includes('--refresh');

export async function runDemo(): Promise<void> {
  try {
    // Check if demo directory exists, if not clone it
    if (!await fs.pathExists(DEMO_DIR)) {
      console.log(chalk.blue('Downloading demo from GitHub...'));
      await cloneDemoRepo();
    } else if (shouldRefresh) {
      // Force refresh if --refresh flag is used
      console.log(chalk.blue('Forcing demo refresh...'));
      await fs.remove(DEMO_DIR);
      await cloneDemoRepo();
    } else {
      console.log(chalk.blue('Using existing demo...'));
      // Pull latest changes
      await updateDemoRepo();
    }

    // Install dependencies if needed
    await installDependencies();

    // Start the demo and open browser
    await startDemo();

  } catch (error) {
    console.error(chalk.red('Error starting demo:'), (error as Error).message);
    process.exit(1);
  }
}

async function cloneDemoRepo(): Promise<void> {
  return new Promise((resolve, reject) => {
    const git = spawn('git', ['clone', DEMO_REPO_URL, DEMO_DIR], {
      stdio: isVerbose ? 'inherit' : 'pipe'
    });

    git.on('close', (code) => {
      if (code === 0) {
        console.log(chalk.green('Demo downloaded successfully'));
        resolve();
      } else {
        reject(new Error(`Git clone failed with code ${code}`));
      }
    });

    git.on('error', (_error) => {
      reject(new Error(`Failed to clone repository`));
    });
  });
}

async function updateDemoRepo(): Promise<void> {
  return new Promise((resolve, _reject) => {
    const git = spawn('git', ['pull'], {
      cwd: DEMO_DIR,
      stdio: isVerbose ? 'inherit' : 'pipe'
    });

    git.on('close', (code) => {
      if (code === 0) {
        console.log(chalk.green('Demo updated successfully'));
        resolve();
      } else {
        console.log(chalk.yellow('Could not update demo, using existing version'));
        resolve(); // Don't fail if update fails
      }
    });

    git.on('error', (_error) => {
      console.log(chalk.yellow('Could not update demo, using existing version'));
      resolve(); // Don't fail if update fails
    });
  });
}

async function installDependencies(): Promise<void> {
  console.log(chalk.blue('Installing dependencies...'));
  
  return new Promise((resolve, reject) => {
    // Use --silent flag to reduce npm output
    const npmArgs = isVerbose ? ['run', 'install-all'] : ['run', 'install-all', '--silent'];
    
    const npm = spawn('npm', npmArgs, {
      cwd: DEMO_DIR,
      stdio: isVerbose ? 'inherit' : 'pipe'
    });

    npm.on('close', (code) => {
      if (code === 0) {
        console.log(chalk.green('Dependencies installed successfully'));
        resolve();
      } else {
        reject(new Error(`npm install failed with code ${code}`));
      }
    });

    npm.on('error', (error) => {
      reject(new Error(`Failed to install dependencies: ${error.message}`));
    });
  });
}

async function startDemo(): Promise<void> {
  console.log(chalk.blue('Starting demo application...'));
  console.log(chalk.green(`Demo will be available at: http://localhost:${DEMO_PORT}`));
  console.log(chalk.yellow('Press Ctrl+C to stop the demo'));
  if (!isVerbose) {
    console.log(chalk.gray('Run with --verbose to see detailed logs'));
  }
  
  return new Promise((resolve, reject) => {
    // Set the port environment variable for the demo
    const env = { 
      ...process.env, 
      PORT: DEMO_PORT.toString(),
      // Suppress deprecation warnings
      NODE_NO_WARNINGS: '1',
      // Suppress React warnings in development
      CI: 'false'
    };
    
    const demo = spawn('npm', ['run', 'dev'], {
      cwd: DEMO_DIR,
      stdio: 'pipe', // Always use pipe to capture output
      env
    });

    let demoOutput = '';

    // Capture and display output
    demo.stdout?.on('data', (data) => {
      const output = data.toString();
      demoOutput += output;
      
      if (isVerbose) {
        // In verbose mode, show everything
        process.stdout.write(output);
      } else {
        // In non-verbose mode, filter and show only important messages
        if (output.includes('Local:') || output.includes('Network:') || output.includes('ready')) {
          process.stdout.write(output);
        }
      }
    });
    
    // Handle stderr
    demo.stderr?.on('data', (data) => {
      const output = data.toString();
      
      if (isVerbose) {
        // In verbose mode, show everything
        process.stderr.write(output);
      } else {
        // In non-verbose mode, show only errors, not warnings
        if (output.includes('Error:') && !output.includes('Warning:')) {
          process.stderr.write(output);
        }
      }
    });
    
    // Open browser after delay if demo didn't handle it
    setTimeout(async () => {
      const demoOpenedBrowser = demoOutput.includes('You can now view');
      
      if (!demoOpenedBrowser) {
        try {
          console.log(chalk.blue('Opening browser...'));
          await open(`http://localhost:${DEMO_PORT}`);
        } catch {
          console.log(chalk.yellow('Could not open browser automatically'));
          console.log(chalk.white(`Please open http://localhost:${DEMO_PORT} in your browser`));
        }
      }
    }, 2000);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log(chalk.yellow('\nShutting down demo...'));
      demo.kill('SIGINT');
      cleanup();
      process.exit(0);
    });

    demo.on('close', (code) => {
      if (code === 0) {
        console.log(chalk.green('Demo stopped successfully'));
        cleanup();
        resolve();
      } else {
        console.log(chalk.red(`Demo stopped with code ${code}`));
        cleanup();
        reject(new Error(`Demo process exited with code ${code}`));
      }
    });

    demo.on('error', (error) => {
      reject(new Error(`Failed to start demo: ${error.message}`));
    });
  });
}

async function cleanup(): Promise<void> {
  try {
    // Optionally clean up the demo directory
    // Uncomment the next line if you want to remove the demo after each run
    // await fs.remove(DEMO_DIR);
  } catch {
    console.log(chalk.yellow('Could not clean up demo directory'));
  }
}