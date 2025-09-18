# Contributing to Clix React Native SDK

We love your input! We want to make contributing to Clix React Native SDK as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

## Pull Request Process

1. Update the README.md with details of changes to the interface, if applicable.
2. Update the documentation with details of any new environment variables, exposed ports, useful file locations and container parameters.
3. The PR will be merged once you have the sign-off of at least one other developer.

## Any contributions you make will be under the MIT Software License

In short, when you submit code changes, your submissions are understood to be under the same [MIT License](http://choosealicense.com/licenses/mit/) that covers the project. Feel free to contact the maintainers if that's a concern.

## Report bugs using GitHub's [issue tracker](https://github.com/clix-so/clix-react-native-sdk/issues)

We use GitHub issues to track public bugs. Report a bug by [opening a new issue](https://github.com/clix-so/clix-react-native-sdk/issues/new); it's that easy!

## Write bug reports with detail, background, and sample code

**Great Bug Reports** tend to have:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample code if you can.
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

## Code Style & Linting

This project uses ESLint and Prettier to enforce code style and maintain code quality. Please ensure your contributions adhere to these standards before submitting a pull request.

**Prerequisites:**

Make sure you have Node.js and npm/yarn installed. You can verify your installation:

```bash
node --version
npm --version
# or
yarn --version
```

**Running the Tools:**

Use the following commands from the project root directory:

- `npm run lint` or `yarn lint`: Lints the codebase using ESLint based on the project configuration. Reports warnings or errors.
- Fix linting issues manually based on ESLint output.
- Use Prettier to format code (configured in project settings).
- `npm run typecheck` or `yarn typecheck`: Runs TypeScript type checking.

**Before Submitting:**

Please run the following commands and ensure they pass without errors:

```bash
npm run lint
npm run typecheck
npm test
```

Resolve all issues before creating a pull request to ensure a smooth review process.

## Native SDK Parity

This React Native SDK maintains API parity with the Clix iOS and Android native SDKs. When contributing:

1. **Check Native Implementation**: Verify behavior matches native SDKs
2. **Method Signatures**: Use identical parameter names and types where possible
3. **Error Handling**: Match native SDK error conditions and types
4. **Async API Pattern**: Follow React Native best practices for async operations

Example of maintaining parity:
```typescript
// Async version (standard React Native pattern)
static async setUserId(userId: string): Promise<void> {
  await this.waitForInitialization();
  await this.instance.deviceService.setUserId(userId);
}

// Error handling matching native pattern
static async setUserProperty(key: string, value: ClixUserProperty): Promise<void> {
  if (!key || typeof key !== 'string') {
    throw new ClixError('INVALID_PARAMETER', 'Property key must be a non-empty string');
  }
  await this.waitForInitialization();
  await this.instance.deviceService.setUserProperty(key, value);
}
```

## Testing

All new features should include appropriate tests:

```bash
# Run all tests
npm test
# or
yarn test

# Run tests in watch mode
npm test -- --watch
# or
yarn test --watch

# Run tests with coverage
npm test -- --coverage
# or
yarn test --coverage
```

Ensure test coverage remains above 80% for new code.

## Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/clix-so/clix-react-native-sdk.git
   cd clix-react-native-sdk
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Prepare the project**
   ```bash
   npm run prepare
   # or
   yarn prepare
   ```

4. **Run the sample app**
   ```bash
   cd samples/BasicApp
   npm install
   # iOS
   cd ios && pod install && cd ..
   npm run ios
   # Android
   npm run android
   ```

## Development Workflow

To get started with the project, run `npm install` in the root directory to install the required dependencies:

```sh
npm install
```

While developing, you can run the [example app](/samples/BasicApp/) to test your changes. Any changes you make in your library's JavaScript code will be reflected in the example app without a rebuild. If you change any native code, then you'll need to rebuild the example app.

To start the packager:

```sh
cd samples/BasicApp
npm start
```

To run the example app on Android:

```sh
cd samples/BasicApp
npm run android
```

To run the example app on iOS:

```sh
cd samples/BasicApp
npm run ios
```

### Commit Message Convention

We follow the [conventional commits specification](https://www.conventionalcommits.org/en) for our commit messages:

- `fix`: bug fixes, e.g. fix crash due to deprecated method.
- `feat`: new features, e.g. add new method to the module.
- `refactor`: code refactor, e.g. migrate from class components to hooks.
- `docs`: changes into documentation, e.g. add usage example for the module.
- `test`: adding or updating tests, e.g. add integration tests using detox.
- `chore`: tooling changes, e.g. change CI config.

Our pre-commit hooks verify that your commit message matches this format when committing.

### Scripts

The `package.json` file contains various scripts for common tasks:

- `npm run typecheck`: type-check files with TypeScript.
- `npm run lint`: lint files with ESLint.
- `npm run test`: run unit tests with Jest.
- `npm run prepare`: prepare the library using bob build.

## TypeScript Guidelines

- Use strict TypeScript settings
- Provide proper type definitions for all public APIs
- Avoid using `any` type
- Document complex types with JSDoc comments
- Export all public types from the main entry point

## Documentation

- Update README.md for any user-facing changes
- Add JSDoc comments for all public methods and classes
- Include code examples in documentation
- Keep the sample app updated with new features

## License

By contributing, you agree that your contributions will be licensed under its MIT License.