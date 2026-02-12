import chalk from 'chalk';

export function showHelp(): void {
  console.log(chalk.bold(chalk.blue('ATXP CLI')));
  console.log(chalk.gray('Command line tool for ATXP tools and development'));
  console.log();

  console.log(chalk.bold('Usage:'));
  console.log('  npx atxp <command> [options]');
  console.log();

  console.log(chalk.bold('Global Options:'));
  console.log('  ' + chalk.yellow('--verbose, -v') + '      ' + 'Enable verbose output (OAuth debug logs)');
  console.log();

  console.log(chalk.bold('Authentication:'));
  console.log('  ' + chalk.cyan('login') + '              ' + 'Log in to ATXP (save connection string)');
  console.log();

  console.log(chalk.bold('Tools:'));
  console.log('  ' + chalk.cyan('search') + ' ' + chalk.yellow('<query>') + '    ' + 'Search the web');
  console.log('  ' + chalk.cyan('image') + ' ' + chalk.yellow('<prompt>') + '    ' + 'Generate an image');
  console.log('  ' + chalk.cyan('music') + ' ' + chalk.yellow('<prompt>') + '    ' + 'Generate music');
  console.log('  ' + chalk.cyan('video') + ' ' + chalk.yellow('<prompt>') + '    ' + 'Generate a video');
  console.log('  ' + chalk.cyan('x') + ' ' + chalk.yellow('<query>') + '        ' + 'Search X/Twitter');
  console.log('  ' + chalk.cyan('email') + ' ' + chalk.yellow('<command>') + '   ' + 'Send and receive emails');
  console.log('  ' + chalk.cyan('balance') + '            ' + 'Check your ATXP account balance');
  console.log('  ' + chalk.cyan('agent') + ' ' + chalk.yellow('<command>') + '   ' + 'Create and manage agent accounts');
  console.log();

  console.log(chalk.bold('PAAS (Platform as a Service):'));
  console.log('  ' + chalk.cyan('paas worker') + '        ' + 'Deploy and manage serverless workers');
  console.log('  ' + chalk.cyan('paas db') + '            ' + 'Create and query databases (D1)');
  console.log('  ' + chalk.cyan('paas storage') + '       ' + 'Manage file storage (R2)');
  console.log('  ' + chalk.cyan('paas dns') + '           ' + 'Manage domains and DNS records');
  console.log('  ' + chalk.cyan('paas analytics') + '     ' + 'Query analytics data');
  console.log();

  console.log(chalk.bold('Development:'));
  console.log('  ' + chalk.cyan('dev demo') + '           ' + 'Run the ATXP demo application');
  console.log(
    '  ' + chalk.cyan('dev create') + ' ' + chalk.yellow('<app>') + '  ' + 'Create a new ATXP project'
  );
  console.log();

  console.log(chalk.bold('Other:'));
  console.log('  ' + chalk.cyan('help') + '               ' + 'Show this help message');
  console.log();

  console.log(chalk.bold('Login Options:'));
  console.log('  ' + chalk.yellow('--token, -t') + '        ' + 'Provide token directly (headless mode)');
  console.log('  ' + chalk.yellow('--qr') + '               ' + 'Use QR code login (for terminals without browser)');
  console.log('  ' + chalk.yellow('--force') + '            ' + 'Update connection string even if already set');
  console.log();

  console.log(chalk.bold('Dev Demo Options:'));
  console.log('  ' + chalk.yellow('--verbose, -v') + '      ' + 'Show detailed logs');
  console.log('  ' + chalk.yellow('--refresh') + '          ' + 'Force refresh the demo from GitHub');
  console.log('  ' + chalk.yellow('--port, -p') + '         ' + 'Specify port (default: 8017)');
  console.log('  ' + chalk.yellow('--dir, -d') + '          ' + 'Specify demo directory');
  console.log();

  console.log(chalk.bold('Dev Create Options:'));
  console.log(
    '  ' + chalk.yellow('--framework, -f') + '    ' + 'Specify framework (express, cloudflare)'
  );
  console.log('  ' + chalk.yellow('--git') + '              ' + 'Force git initialization');
  console.log('  ' + chalk.yellow('--no-git') + '           ' + 'Skip git initialization');
  console.log();

  console.log(chalk.bold('Examples:'));
  console.log('  npx atxp login                         # Log in to ATXP (browser)');
  console.log('  npx atxp login --qr                    # Log in with QR code');
  console.log('  npx atxp login --token $TOKEN          # Log in with token (headless)');
  console.log('  npx atxp search "latest AI news"       # Search the web');
  console.log('  npx atxp image "sunset over mountains" # Generate an image');
  console.log('  npx atxp music "relaxing piano"        # Generate music');
  console.log('  npx atxp video "ocean waves"           # Generate a video');
  console.log('  npx atxp x "trending topics"           # Search X/Twitter');
  console.log('  npx atxp email inbox                   # Check your email inbox');
  console.log('  npx atxp email read <messageId>        # Read a specific message');
  console.log('  npx atxp email send --to user@example.com --subject "Hi" --body "Hello!"');
  console.log('  npx atxp balance                       # Check account balance');
  console.log('  npx atxp dev demo                      # Run the demo');
  console.log('  npx atxp dev create my-app             # Create a new project');
  console.log();

  console.log(chalk.bold('Agent Examples:'));
  console.log('  npx atxp agent create                  # Create a new agent (requires login)');
  console.log('  npx atxp agent list                    # List your agents (requires login)');
  console.log('  npx atxp agent register                # Self-register as an agent (no login)');
  console.log();

  console.log(chalk.bold('PAAS Examples:'));
  console.log('  npx atxp paas worker deploy my-api --code ./worker.js');
  console.log('  npx atxp paas db create my-database');
  console.log('  npx atxp paas db query mydb --sql "SELECT * FROM users"');
  console.log('  npx atxp paas storage create my-bucket');
  console.log('  npx atxp paas storage upload my-bucket logo.png --file ./logo.png');
  console.log('  npx atxp paas dns add example.com');
  console.log('  npx atxp paas dns connect example.com my-api');
  console.log();

  console.log(chalk.bold('Learn more:'));
  console.log('  Website: ' + chalk.underline('https://atxp.dev'));
  console.log('  GitHub:  ' + chalk.underline('https://github.com/atxp-dev/cli'));
}
