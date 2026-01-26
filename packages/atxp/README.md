# ATXP CLI

Command line tool for ATXP tools and development.

## Installation

```bash
# Run directly with npx (recommended)
npx atxp

# Or install globally
npm install -g atxp
```

## Quick Start

```bash
# Log in to ATXP
npx atxp login

# Search the web
npx atxp search "latest AI news"

# Generate an image
npx atxp image "sunset over mountains"

# Search X/Twitter
npx atxp x "trending topics"
```

## Commands

### Authentication

#### `npx atxp login [options]`
Log in to ATXP by saving your connection string.

Get your connection string from: https://accounts.atxp.ai

**Options:**
- `--force` - Update connection string even if already set

After login, source the config to use in your terminal:
```bash
source ~/.atxp/config
```

### Tools

#### `npx atxp search <query>`
Search the web using ATXP.

```bash
npx atxp search "latest AI news"
npx atxp search "weather in San Francisco"
```

#### `npx atxp image <prompt>`
Generate an image from a text prompt.

```bash
npx atxp image "sunset over mountains"
npx atxp image "a cute robot playing guitar"
```

#### `npx atxp music <prompt>`
Generate music from a text prompt.

```bash
npx atxp music "relaxing piano"
npx atxp music "upbeat electronic dance"
```

#### `npx atxp video <prompt>`
Generate a video from a text prompt.

```bash
npx atxp video "ocean waves crashing"
npx atxp video "timelapse of clouds"
```

#### `npx atxp x <query>`
Search X/Twitter for live content.

```bash
npx atxp x "trending topics"
npx atxp x "AI announcements"
```

### Development

#### `npx atxp dev demo [options]`
Runs the interactive ATXP demo application.

**Options:**
- `--verbose, -v` - Show detailed logs
- `--refresh` - Force refresh demo from GitHub
- `--port, -p` - Specify port number (default: 8017)
- `--dir, -d` - Specify demo directory (default: ~/.cache/atxp/demo)

**Examples:**
```bash
npx atxp dev demo
npx atxp dev demo --verbose
npx atxp dev demo --port 3000
```

#### `npx atxp dev create <app-name> [options]`
Creates a new ATXP project with the specified name.

**Options:**
- `--framework, -f` - Specify framework template (default: express)
- `--git` - Force git initialization
- `--no-git` - Skip git initialization

**Examples:**
```bash
npx atxp dev create my-app
npx atxp dev create my-app --framework express
npx atxp dev create my-app --no-git
```

### Other

#### `npx atxp help`
Displays help information.

## About ATXP

ATXP is a platform for building web agents with OAuth and payment capabilities. This CLI tool helps you:

- Access ATXP tools (search, image generation, music, video, X search)
- Explore ATXP features through interactive demos
- Bootstrap new projects with ATXP integration

## Learn More

- Website: https://atxp.dev
- GitHub: https://github.com/atxp-dev/cli
- Documentation: https://docs.atxp.dev

## License

MIT
