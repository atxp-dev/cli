# ATXP CLI

Command line tool for creating ATXP projects and running demos.

## Installation

```bash
# Run directly with npx (recommended)
npx atxp

# Or install globally
npm install -g atxp
```

## Quick Start

```bash
# Show help and available commands
npx atxp

# Run the interactive demo
npx atxp demo

# Create a new project (requires app name)
npx atxp create my-app
```

## Commands

### `npx atxp`
Shows help information and available commands.

### `npx atxp demo [options]`
Runs the interactive ATXP demo application.

**Options:**
- `--verbose, -v` - Show detailed logs
- `--refresh` - Force refresh demo from GitHub
- `--port, -p` - Specify port number (default: 8017)
- `--dir, -d` - Specify demo directory (default: ~/.cache/atxp/demo)

**Examples:**
```bash
npx atxp demo
npx atxp demo --verbose
npx atxp demo --port 3000
npx atxp demo --dir ./my-demo
npx atxp demo --port 3000 --dir ./my-demo --verbose
npx atxp demo --refresh
```

### `npx atxp create <app-name> [options]`
Creates a new ATXP project with the specified name.

**Options:**
- `--framework, -f` - Specify framework template (default: express)
- `--git` - Force git initialization
- `--no-git` - Skip git initialization

**Examples:**
```bash
# Basic usage (auto-detects git)
npx atxp create my-app

# With specific framework  
npx atxp create my-app --framework express

# Skip git initialization
npx atxp create my-app --no-git

# Force git initialization
npx atxp create my-app --git

# Alternative using npm create
npm create atxp my-app
```

### `npx atxp help`
Displays help information (same as running `npx atxp`).

## About ATXP

ATXP is a platform for building web agents with OAuth and payment capabilities. This CLI tool helps you:

- Explore ATXP features through interactive demos
- Bootstrap new projects with ATXP integration
- Set up development environments quickly

## Learn More

- Website: https://atxp.dev
- GitHub: https://github.com/atxp-dev/cli
- Documentation: https://docs.atxp.dev

## License

MIT