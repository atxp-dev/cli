# ATXP CLI

Command line tools for the ATXP ecosystem - create projects and run demos.

## Packages

This monorepo contains:

- **`atxp`** - Main CLI package for creating projects and running demos
- **`create-atxp`** - Wrapper package for `npm create atxp` support

## Usage

### Run Demo
```bash
npx atxp
# or with verbose output
npx atxp --verbose
```

### Create Project
```bash
npx atxp create
# or
npm create atxp
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