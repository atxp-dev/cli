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

# Create a new project
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

**Examples:**
```bash
npx atxp demo
npx atxp demo --verbose
npx atxp demo --refresh
```

### `npx atxp create [project-name]`
Creates a new ATXP project with the specified name.

**Examples:**
```bash
npx atxp create my-app
npx atxp create my-agent-project
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