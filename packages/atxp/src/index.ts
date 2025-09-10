#!/usr/bin/env node

import path from 'path';
import os from 'os';
import { createProject, type Framework } from './create-project.js';
import { runDemo } from './run-demo.js';
import { showHelp } from './help.js';
import { checkAllDependencies, showDependencyError } from './check-dependencies.js';

interface DemoOptions {
  port: number;
  dir: string;
  verbose: boolean;
  refresh: boolean;
}

interface CreateOptions {
  framework?: Framework;
  appName?: string;
}

// Parse command line arguments
function parseArgs(): { command: string; demoOptions: DemoOptions; createOptions: CreateOptions } {
  const command = process.argv[2];
  
  // Parse demo options
  const getArgValue = (flag: string, shortFlag: string): string | undefined => {
    const index = process.argv.findIndex(arg => arg === flag || arg === shortFlag);
    return index !== -1 ? process.argv[index + 1] : undefined;
  };
  
  const port = (() => {
    const portValue = getArgValue('--port', '-p');
    if (portValue) {
      const parsed = parseInt(portValue, 10);
      if (parsed > 0 && parsed < 65536) return parsed;
    }
    return 8017; // default port (previously backend port)
  })();
  
  const dir = (() => {
    const dirValue = getArgValue('--dir', '-d');
    return dirValue ? path.resolve(dirValue) : path.join(os.homedir(), '.cache', 'atxp', 'demo');
  })();
  
  const verbose = process.argv.includes('--verbose') || process.argv.includes('-v');
  const refresh = process.argv.includes('--refresh');
  
  // Parse create options
  const framework = getArgValue('--framework', '-f') as Framework | undefined;
  
  // Handle app name for different invocation methods
  let appName: string | undefined;
  if (command === 'create') {
    // npx atxp create <app-name>
    appName = process.argv[3];
  } else if (process.env.npm_config_argv?.includes('create')) {
    // npm create atxp <app-name> 
    // The app name is typically the last argument in this case
    const args = process.argv.slice(2);
    appName = args.find(arg => !arg.startsWith('-') && arg !== 'create');
  }
  
  return {
    command,
    demoOptions: { port, dir, verbose, refresh },
    createOptions: { framework, appName }
  };
}

const { command, demoOptions, createOptions } = parseArgs();

// Detect if we're in create mode (npm create atxp or npx atxp create)
const isCreateMode = process.env.npm_config_argv?.includes('create') || 
                     process.argv.includes('--create') || 
                     command === 'create';

// Handle different commands
async function main() {
  if (isCreateMode) {
    console.log('Creating new ATXP project...');
    const dependenciesOk = await checkAllDependencies('create');
    if (!dependenciesOk) {
      showDependencyError('create');
      process.exit(1);
    }
    
    // Validate required parameters
    const appName = createOptions.appName;
    if (!appName) {
      console.error('Error: App name is required');
      console.log('Usage: npx atxp create <app-name> [--framework express]');
      process.exit(1);
    }
    
    const framework: Framework = createOptions.framework || 'express';
    
    // Validate framework
    const validFrameworks: Framework[] = ['express'];
    if (createOptions.framework && !validFrameworks.includes(createOptions.framework)) {
      console.error(`Error: Unknown framework "${createOptions.framework}". Available frameworks: ${validFrameworks.join(', ')}`);
      process.exit(1);
    }
    
    createProject(appName, framework);
  } else if (command === 'demo') {
    console.log('Starting ATXP demo...');
    const dependenciesOk = await checkAllDependencies('demo');
    if (!dependenciesOk) {
      showDependencyError('demo');
      process.exit(1);
    }
    runDemo(demoOptions);
  } else if (command === 'help' || command === '--help' || command === '-h') {
    showHelp();
  } else if (!command) {
    // No command provided - show help instead of running demo
    showHelp();
  } else {
    // Unknown command - show help instead of just error
    console.log(`Unknown command: ${command}`);
    console.log();
    showHelp();
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('An unexpected error occurred:', error.message);
  process.exit(1);
});