#!/usr/bin/env node

import { createProject } from './create-project.js';
import { runDemo } from './run-demo.js';
import { showHelp } from './help.js';

// Get the command from arguments
const command = process.argv[2];

// Detect if we're in create mode (npm create atxp or npx atxp create)
const isCreateMode = process.env.npm_config_argv?.includes('create') || 
                     process.argv.includes('--create') || 
                     command === 'create';

// Handle different commands
if (isCreateMode) {
  console.log('Creating new ATXP project...');
  createProject();
} else if (command === 'demo') {
  console.log('Starting ATXP demo...');
  runDemo();
} else if (command === 'help' || command === '--help' || command === '-h') {
  showHelp();
} else if (!command) {
  // No command provided - show help instead of running demo
  showHelp();
} else {
  // Unknown command
  console.log(`Unknown command: ${command}`);
  console.log('Run "npx atxp help" for usage information.');
  process.exit(1);
}