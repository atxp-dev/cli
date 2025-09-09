#!/usr/bin/env node

import { spawn } from 'child_process';

// Call the atxp package with --create flag
const atxp = spawn('npx', ['atxp', '--create'], {
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