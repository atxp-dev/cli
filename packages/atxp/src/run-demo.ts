import chalk from 'chalk';
import { spawn } from 'child_process';
import fs from 'fs-extra';
import open from 'open';

interface DemoOptions {
  port: number;
  dir: string;
  verbose: boolean;
  refresh: boolean;
}

const DEMO_REPO_URL = 'https://github.com/atxp-dev/atxp-express-example.git';

export async function runDemo(options: DemoOptions): Promise<void> {
  try {
    // Check if demo directory exists, if not clone it
    if (!await fs.pathExists(options.dir)) {
      console.log(chalk.blue('Downloading demo from GitHub...'));
      await cloneDemoRepo(options.dir, options.verbose);
    } else if (options.refresh) {
      // Force refresh if --refresh flag is used
      console.log(chalk.blue('Forcing demo refresh...'));
      await fs.remove(options.dir);
      await cloneDemoRepo(options.dir, options.verbose);
    } else {
      console.log(chalk.blue('Using existing demo...'));
      // Pull latest changes
      await updateDemoRepo(options.dir, options.verbose);
    }

    // Install dependencies if needed
    await installDependencies(options.dir, options.verbose);

    // Start the demo and open browser
    await startDemo(options.port, options.dir, options.verbose);

  } catch (error) {
    console.error(chalk.red('Error starting demo:'), (error as Error).message);
    process.exit(1);
  }
}

async function cloneDemoRepo(demoDir: string, isVerbose: boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    const git = spawn('git', [
      'clone', 
      '--depth', '1',           // Shallow clone - only latest commit
      '--single-branch',        // Only clone the default branch
      '--branch', 'main',       // Explicitly target main branch
      DEMO_REPO_URL, 
      demoDir
    ], {
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

async function updateDemoRepo(demoDir: string, isVerbose: boolean): Promise<void> {
  return new Promise((resolve, _reject) => {
    // First fetch the latest changes
    const fetch = spawn('git', [
      'fetch', 
      '--depth', '1',           // Keep shallow history during fetch
      'origin', 'main'          // Explicitly fetch from main branch
    ], {
      cwd: demoDir,
      stdio: isVerbose ? 'inherit' : 'pipe'
    });

    fetch.on('close', (fetchCode) => {
      if (fetchCode !== 0) {
        console.log(chalk.yellow('Could not fetch updates, using existing version'));
        resolve();
        return;
      }

      // Reset local branch to match remote exactly (discarding any local changes)
      const reset = spawn('git', [
        'reset', 
        '--hard',               // Discard local changes
        'origin/main'           // Reset to remote main branch
      ], {
        cwd: demoDir,
        stdio: isVerbose ? 'inherit' : 'pipe'
      });

      reset.on('close', (resetCode) => {
        if (resetCode === 0) {
          console.log(chalk.green('Demo updated successfully'));
          resolve();
        } else {
          console.log(chalk.yellow('Could not update demo, using existing version'));
          resolve(); // Don't fail if update fails
        }
      });

      reset.on('error', (_error) => {
        console.log(chalk.yellow('Could not update demo, using existing version'));
        resolve(); // Don't fail if update fails
      });
    });

    fetch.on('error', (_error) => {
      console.log(chalk.yellow('Could not update demo, using existing version'));
      resolve(); // Don't fail if update fails
    });
  });
}

async function installDependencies(demoDir: string, isVerbose: boolean): Promise<void> {
  console.log(chalk.blue('Installing dependencies...'));
  
  return new Promise((resolve, reject) => {
    // Use --silent flag to reduce npm output
    const npmArgs = isVerbose ? ['run', 'setup'] : ['run', 'setup', '--silent'];
    
    const npm = spawn('npm', npmArgs, {
      cwd: demoDir,
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

async function startDemo(port: number, demoDir: string, isVerbose: boolean): Promise<void> {
  console.log(chalk.blue('Starting demo application...'));
  console.log(chalk.green(`Demo will be available at: http://localhost:${port}`));
  console.log(chalk.gray(`Demo directory: ${demoDir}`));
  console.log(chalk.yellow('Press Ctrl+C to stop the demo'));
  if (!isVerbose) {
    console.log(chalk.gray('Run with --verbose to see detailed logs'));
  }
  
  return new Promise((resolve, reject) => {
    // Set the port environment variable for the demo
    const env = { 
      ...process.env, 
      // Server will use PORT from its .env file
      PORT: port.toString(),
      NODE_ENV: 'production',
      // Suppress deprecation warnings
      NODE_NO_WARNINGS: '1',
      // Suppress React warnings in development
      CI: 'false'
    };
    
    const demo = spawn('npm', ['run', 'start'], {
      cwd: demoDir,
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
          await open(`http://localhost:${port}`);
        } catch {
          console.log(chalk.yellow('Could not open browser automatically'));
          console.log(chalk.white(`Please open http://localhost:${port} in your browser`));
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