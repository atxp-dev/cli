# create-atxp

Developer documentation for the `create-atxp` wrapper package.

## Overview

The `create-atxp` package is a thin wrapper that enables the `npm create atxp` syntax by proxying calls to the main `atxp` package. This follows the convention used by other CLI tools like `create-react-app`, `create-next-app`, etc.

## Architecture

```
npm create atxp my-app --framework express
        ↓
create-atxp/index.js
        ↓  
npx atxp create my-app --framework express
        ↓
packages/atxp/src/index.ts
```

### How it works:
1. User runs `npm create atxp <args>`
2. npm automatically runs `npx create-atxp <args>`
3. `create-atxp/index.js` transforms this into `npx atxp create <args>`
4. The main `atxp` package handles the actual project creation

## Development

### Prerequisites
- Node.js 18+
- The main `atxp` package built and available

### Setup
```bash
cd packages/create-atxp
npm install
```

### Testing the Wrapper

#### Test Basic Functionality
```bash
# From packages/create-atxp directory
node index.js test-app

# Should be equivalent to:
# npx atxp create test-app
```

#### Test with Flags
```bash
# Test framework flag
node index.js test-app --framework express

# Test git flags  
node index.js test-app --no-git
node index.js test-app --git

# Test help
node index.js --help
```

#### Test npm create Syntax
```bash
# From repo root, test the actual npm create flow
npm create atxp test-app
npm create atxp test-app --framework express --no-git
```

### Debugging

#### Enable Verbose Output
```bash
# See exactly what command is being executed
node index.js test-app --verbose
```

#### Check Dependencies
```bash
# Verify atxp package is available
npx atxp --help

# Check if create-atxp can find atxp
npm ls atxp
```

### Common Issues

#### "Command not found" errors
- Ensure `atxp` package is built: `cd ../atxp && npm run build`
- Check that `atxp` is in dependencies: check `package.json`

#### Arguments not passing through
- Verify `process.argv.slice(2)` is correctly capturing all arguments
- Test with `console.log(atxpArgs)` in `index.js`

#### Version mismatches
- Both packages should have the same version number
- Check `atxp` dependency version in `package.json`

## Version Management

The `create-atxp` package version should always match the main `atxp` package:

```bash
# Check current versions
cd packages/atxp && npm version
cd ../create-atxp && npm version

# Update versions (should be done together)
npm version patch  # in both packages
```

## Testing Checklist

Before releasing, verify:

- [ ] `node index.js test-app` creates project successfully
- [ ] `node index.js test-app --framework express` works  
- [ ] `node index.js test-app --no-git` skips git initialization
- [ ] `node index.js test-app --git` forces git initialization
- [ ] `node index.js --help` shows help information
- [ ] `npm create atxp test-app` works from repo root
- [ ] All arguments pass through correctly
- [ ] Error messages are clear and helpful
- [ ] Package.json versions match between both packages

## File Structure

```
packages/create-atxp/
├── README.md           # This developer documentation
├── package.json        # Package configuration and dependencies
├── index.js           # Main wrapper script
└── eslint.config.js   # ESLint configuration
```

## Dependencies

- **`atxp`**: The main CLI package (exact version match)
- **`eslint`**, **`globals`**: Development dependencies for linting

## Publishing

This package is published to npm as `create-atxp` and should be published alongside the main `atxp` package with matching versions.

```bash
# Build and test first
npm run build
npm test

# Publish (from packages/create-atxp)
npm publish
```

## Contributing

When modifying the wrapper:
1. Test locally with `node index.js`
2. Test with `npm create atxp` syntax  
3. Verify all flags and arguments pass through
4. Update tests if needed
5. Ensure version stays in sync with main package