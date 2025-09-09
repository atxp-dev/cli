#!/usr/bin/env node

import { createProject } from './create-project.js';
import { runDemo } from './run-demo.js';

// Detect if we're in create mode (npm create atxp or npx atxp create)
const isCreateMode = process.env.npm_config_argv?.includes('create') || 
                     process.argv.includes('--create') || 
                     process.argv[2] === 'create';

if (isCreateMode) {
  console.log('Creating new ATXP project...');
  createProject();
} else {
  console.log('Starting ATXP demo...');
  runDemo();
}