#!/usr/bin/env node

import path from 'path';
import os from 'os';
import { createProject, type Framework } from './create-project.js';
import { runDemo } from './run-demo.js';
import { showHelp } from './help.js';
import { checkAllDependencies, showDependencyError } from './check-dependencies.js';
import { login } from './login.js';
import { searchCommand } from './commands/search.js';
import { imageCommand } from './commands/image.js';
import { musicCommand } from './commands/music.js';
import { videoCommand } from './commands/video.js';
import { xCommand } from './commands/x.js';

interface DemoOptions {
  port: number;
  dir: string;
  verbose: boolean;
  refresh: boolean;
}

interface CreateOptions {
  framework?: Framework;
  appName?: string;
  git?: 'git' | 'no-git';
}

interface LoginOptions {
  force: boolean;
}

// Parse command line arguments
function parseArgs(): {
  command: string;
  subCommand?: string;
  demoOptions: DemoOptions;
  createOptions: CreateOptions;
  loginOptions: LoginOptions;
  toolArgs: string;
} {
  const command = process.argv[2];
  const subCommand = process.argv[3];

  // Check for help flags early
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    return {
      command: 'help',
      demoOptions: { port: 8017, dir: '', verbose: false, refresh: false },
      createOptions: { framework: undefined, appName: undefined, git: undefined },
      loginOptions: { force: false },
      toolArgs: '',
    };
  }

  // Parse demo options
  const getArgValue = (flag: string, shortFlag: string): string | undefined => {
    const index = process.argv.findIndex((arg) => arg === flag || arg === shortFlag);
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
  const force = process.argv.includes('--force');

  // Parse create options
  const framework = getArgValue('--framework', '-f') as Framework | undefined;

  // Parse git options
  let git: 'git' | 'no-git' | undefined;
  if (process.argv.includes('--git')) {
    git = 'git';
  } else if (process.argv.includes('--no-git')) {
    git = 'no-git';
  }

  // Handle app name for different invocation methods
  let appName: string | undefined;
  if (command === 'dev' && subCommand === 'create') {
    // npx atxp dev create <app-name>
    appName = process.argv[4];
  } else if (command === 'create') {
    // npx atxp create <app-name> (legacy support)
    appName = process.argv[3];
  } else if (process.env.npm_config_argv?.includes('create')) {
    // npm create atxp <app-name>
    const args = process.argv.slice(2);
    appName = args.find((arg) => !arg.startsWith('-') && arg !== 'create');
  }

  // Get tool arguments (everything after the command)
  const toolArgs = process.argv.slice(3).filter((arg) => !arg.startsWith('-')).join(' ');

  return {
    command,
    subCommand,
    demoOptions: { port, dir, verbose, refresh },
    createOptions: { framework, appName, git },
    loginOptions: { force },
    toolArgs,
  };
}

const { command, subCommand, demoOptions, createOptions, loginOptions, toolArgs } = parseArgs();

// Detect if we're in create mode (npm create atxp or npx atxp create)
const isCreateMode =
  process.env.npm_config_argv?.includes('create') ||
  process.argv.includes('--create') ||
  command === 'create';

// Handle different commands
async function main() {
  // Legacy create mode support (npm create atxp)
  if (isCreateMode && command !== 'dev') {
    console.log('Creating new ATXP project...');
    const dependenciesOk = await checkAllDependencies('create');
    if (!dependenciesOk) {
      showDependencyError('create');
      process.exit(1);
    }

    const appName = createOptions.appName;
    if (!appName) {
      console.error('Error: App name is required');
      console.log('Usage: npx atxp dev create <app-name> [--framework express|cloudflare|mastra]');
      process.exit(1);
    }

    if ((createOptions.framework as unknown as string) === 'mastra') {
      console.log(
        'Mastra support coming soon. Join our Discord at https://discord.gg/FuJXHhe9aW to get notified when Mastra support is available.'
      );
      process.exit(0);
    }

    const framework: Framework = createOptions.framework || 'express';
    const validFrameworks: Framework[] = ['express', 'cloudflare', 'mastra'];
    if (createOptions.framework && !validFrameworks.includes(createOptions.framework)) {
      console.error(
        `Error: Unknown framework "${createOptions.framework}". Available frameworks: ${validFrameworks.join(', ')}`
      );
      process.exit(1);
    }

    createProject(appName, framework, createOptions.git);
    return;
  }

  // New command structure
  switch (command) {
    case 'login':
      await login(loginOptions);
      break;

    case 'search':
      await searchCommand(toolArgs);
      break;

    case 'image':
      await imageCommand(toolArgs);
      break;

    case 'music':
      await musicCommand(toolArgs);
      break;

    case 'video':
      await videoCommand(toolArgs);
      break;

    case 'x':
      await xCommand(toolArgs);
      break;

    case 'dev':
      // Dev subcommands (demo, create)
      if (subCommand === 'demo') {
        console.log('Starting ATXP demo...');
        const dependenciesOk = await checkAllDependencies('demo');
        if (!dependenciesOk) {
          showDependencyError('demo');
          process.exit(1);
        }
        runDemo(demoOptions);
      } else if (subCommand === 'create') {
        console.log('Creating new ATXP project...');
        const dependenciesOk = await checkAllDependencies('create');
        if (!dependenciesOk) {
          showDependencyError('create');
          process.exit(1);
        }

        const appName = createOptions.appName;
        if (!appName) {
          console.error('Error: App name is required');
          console.log(
            'Usage: npx atxp dev create <app-name> [--framework express|cloudflare|mastra]'
          );
          process.exit(1);
        }

        if ((createOptions.framework as unknown as string) === 'mastra') {
          console.log(
            'Mastra support coming soon. Join our Discord at https://discord.gg/FuJXHhe9aW to get notified when Mastra support is available.'
          );
          process.exit(0);
        }

        const framework: Framework = createOptions.framework || 'express';
        const validFrameworks: Framework[] = ['express', 'cloudflare', 'mastra'];
        if (createOptions.framework && !validFrameworks.includes(createOptions.framework)) {
          console.error(
            `Error: Unknown framework "${createOptions.framework}". Available frameworks: ${validFrameworks.join(', ')}`
          );
          process.exit(1);
        }

        createProject(appName, framework, createOptions.git);
      } else {
        console.log(`Unknown dev command: ${subCommand}`);
        console.log('Available: npx atxp dev demo, npx atxp dev create <app-name>');
        process.exit(1);
      }
      break;

    case 'demo': {
      // Legacy support - redirect to dev demo
      console.log('Starting ATXP demo...');
      const demoDepOk = await checkAllDependencies('demo');
      if (!demoDepOk) {
        showDependencyError('demo');
        process.exit(1);
      }
      runDemo(demoOptions);
      break;
    }

    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;

    case undefined:
      showHelp();
      break;

    default:
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
