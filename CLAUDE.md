# CLAUDE.md

## Release Process

**Never manually bump versions in package.json files.** The release workflow handles version bumps automatically.

To release a new version:
1. Merge your feature PR to main (without any version changes)
2. Create a GitHub Release with the new version tag (e.g., `v1.3.0`)
3. The workflow will automatically update package.json files, commit with `[skip ci]`, and publish to npm
