#!/usr/bin/env node

import { spawn } from 'child_process';

// Get arguments passed to create-atxp (excluding node and script name)
const args = process.argv.slice(2);

// Build the command: npx atxp create <args>
const atxpArgs = ['atxp', 'create', ...args];

// Call the atxp package with create command and pass through all arguments
const atxp = spawn('npx', atxpArgs, {
  stdio: 'inherit',
  cwd: process.cwd()
});

atxp.on('close', (code) => {
  process.exit(code);
});

atxp.on('error', (error) => {
  console.error('Failed to run atxp:', error.message);
  process.exit(1);
});