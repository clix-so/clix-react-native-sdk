# Publishing to GitHub Packages

This document explains how to publish the `@clix/react-native-sdk` package to GitHub Packages.

## Overview

The package is published to GitHub Packages using GitHub Actions workflows. The publishing process is automated and triggered by:

1. **Tag pushes**: When a version tag (e.g., `v1.0.0`) is pushed to the repository
2. **Manual dispatch**: Through the GitHub Actions UI

## Workflows

### 1. Test and Build (`test.yml`)
- Runs on pushes to `main` and `develop` branches
- Runs on pull requests to `main` branch
- Executes:
  - Type checking
  - Linting
  - Tests
  - Package building

### 2. Create Release (`release.yml`)
- Runs when version tags are pushed
- Creates GitHub releases with changelog
- Uses `release-it` for automated release management

### 3. Publish to GitHub Packages (`publish.yml`)
- Runs when version tags are pushed
- Publishes the package to GitHub Packages
- Requires `packages:write` permission

## Publishing Process

### Prerequisites

1. **Repository Settings**: Ensure the repository has the following settings:
   - Go to Settings → Actions → General
   - Enable "Read and write permissions" for Actions
   - Go to Settings → Packages → Package creation
   - Ensure "Inherit access from source repository" is enabled

2. **Node.js Version**: The workflows use Node.js 20 to support `react-native-builder-bob` requirements

3. **Package Configuration**: The package is configured for GitHub Packages:
   - `publishConfig.registry` set to `https://npm.pkg.github.com`
   - `.npmrc` file configured for authentication
   - Package scope set to `@clix`

### Publishing Steps

1. **Version Update**: Update the version in `package.json`
2. **Create Tag**: Create and push a version tag:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
3. **Automated Process**: The workflows will automatically:
   - Run tests and build the package
   - Create a GitHub release
   - Publish to GitHub Packages

### Manual Publishing

To manually trigger publishing:

1. Go to the repository on GitHub
2. Navigate to Actions → Publish to GitHub Packages
3. Click "Run workflow"
4. Select the branch and click "Run workflow"

## Installation for Consumers

Users can install the package using:

```bash
npm install @clix/react-native-sdk
```

If they encounter authentication issues, they may need to:

1. **Login to GitHub Packages**:
   ```bash
   npm login --scope=@clix --registry=https://npm.pkg.github.com
   ```

2. **Create `.npmrc` file**:
   ```
   @clix:registry=https://npm.pkg.github.com
   //npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
   ```

## Troubleshooting

### Common Issues

1. **Authentication Errors**: Ensure the repository has proper permissions for GitHub Packages
2. **Build Failures**: Check that all tests pass and the package builds successfully
3. **Version Conflicts**: Ensure the version in `package.json` matches the git tag

### Debugging

- Check the Actions tab for workflow logs
- Verify package.json configuration
- Ensure all required permissions are set

## Security

- The `GITHUB_TOKEN` is automatically provided by GitHub Actions
- No additional secrets are required for basic publishing
- Package scope ensures proper access control 