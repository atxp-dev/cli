# ATXP CLI

Command line tools for the ATXP ecosystem - create projects and run demos.

## About ATXP

ATXP is a platform for building web agents with OAuth and payment capabilities. The CLI helps you:

- Create new projects with ATXP integration
- Set up development environments quickly
- Run interactive demos to explore ATXP features  

## Packages

This monorepo contains:

- **`atxp`** - Main CLI package for creating projects and running demos
- **`create-atxp`** - Wrapper package for `npm create atxp` support

## Commands

- `npx atxp` - Show help and available commands
- `npx atxp demo` - Run the interactive demo application
- `npx atxp create <app-name>` - Create a new ATXP project
- `npx atxp help` - Display help information

### Demo Options
- `--verbose, -v` - Show detailed logs
- `--refresh` - Force refresh demo from GitHub
- `--port, -p` - Specify port number (default: 8017)
- `--dir, -d` - Specify demo directory (default: ~/.cache/atxp/demo)

### Create Options
- `--framework, -f` - Specify framework template (default: express)
- `--git` - Force git initialization
- `--no-git` - Skip git initialization

## Examples

### Get Started
```bash
# Show available commands and help
npx atxp
```

### Try the Demo
```bash
# Run the interactive demo
npx atxp demo

# Run with detailed output  
npx atxp demo --verbose

# Use custom port
npx atxp demo --port 3000

# Use custom directory
npx atxp demo --dir ./my-demo

# Combine options
npx atxp demo --port 3000 --dir ./my-demo --verbose

# Force refresh from GitHub
npx atxp demo --refresh
```

### Create a New Project
```bash
# Create a new project (auto-detects git)
npx atxp create my-app

# Create with specific framework
npx atxp create my-app --framework express

# Skip git initialization
npx atxp create my-app --no-git

# Force git initialization
npx atxp create my-app --git

# Alternative method using npm create
npm create atxp my-app

# Set up the project
cd my-app
npm install
npm start
```

## Development

Install dependencies:
```bash
npm install
```

Build all packages:
```bash
npm run build
```

Test the CLI locally:
```bash
cd packages/atxp
npm run dev
```

## Publishing

Each package is published independently:

```bash
cd packages/atxp
npm publish

cd ../create-atxp  
npm publish
```

## License

MIT