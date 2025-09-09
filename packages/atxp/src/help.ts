import chalk from 'chalk';

export function showHelp(): void {
  console.log(chalk.bold(chalk.blue('ATXP CLI')));
  console.log(chalk.gray('Command line tool for creating ATXP projects and running demos'));
  console.log();
  
  console.log(chalk.bold('Usage:'));
  console.log('  npx atxp <command> [options]');
  console.log();
  
  console.log(chalk.bold('Commands:'));
  console.log('  ' + chalk.cyan('demo') + '     ' + 'Run the ATXP demo application');
  console.log('  ' + chalk.cyan('create') + '   ' + 'Create a new ATXP project');
  console.log('  ' + chalk.cyan('help') + '     ' + 'Show this help message');
  console.log();
  
  console.log(chalk.bold('Demo Options:'));
  console.log('  ' + chalk.yellow('--verbose, -v') + '  ' + 'Show detailed logs');
  console.log('  ' + chalk.yellow('--refresh') + '      ' + 'Force refresh the demo from GitHub');
  console.log('  ' + chalk.yellow('--port, -p') + '    ' + 'Specify port number (default: 8016)');
  console.log('  ' + chalk.yellow('--dir, -d') + '     ' + 'Specify demo directory (default: ~/.cache/atxp/demo)');
  console.log();
  
  console.log(chalk.bold('Examples:'));
  console.log('  npx atxp demo                          # Run the demo with defaults');
  console.log('  npx atxp demo --verbose                # Run demo with detailed logs');
  console.log('  npx atxp demo --port 3000              # Run demo on port 3000');
  console.log('  npx atxp demo --dir ./my-demo          # Use custom demo directory');
  console.log('  npx atxp demo --port 3000 --dir ./demo # Custom port and directory');
  console.log('  npx atxp create                        # Create a new project');
  console.log();
  
  console.log(chalk.bold('Learn more:'));
  console.log('  Website: ' + chalk.underline('https://atxp.dev'));
  console.log('  GitHub:  ' + chalk.underline('https://github.com/atxp-dev/cli'));
}