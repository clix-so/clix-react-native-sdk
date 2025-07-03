# Contributing

We want this community to be friendly and respectful to each other. Please follow it in all your interactions with the project.

## Development workflow

To get started with the project, run `npm install` in the root directory to install the required dependencies:

```sh
npm install
```

While developing, you can run the [example app](/samples/BasicApp/) to test your changes. Any changes you make in your library's JavaScript code will be reflected in the example app without a rebuild. If you change any native code, then you'll need to rebuild the example app.

To start the packager:

```sh
npm run example
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

Make sure your code passes TypeScript and ESLint. Run the following to verify:

```sh
npm run typecheck
npm run lint
```

To fix formatting errors, run the following:

```sh
npm run lint --fix
```

Remember to add tests for your change if possible. Run the tests by:

```sh
npm test
```

### Commit message convention

We follow the [conventional commits specification](https://www.conventionalcommits.org/en) for our commit messages:

- `fix`: bug fixes, e.g. fix crash due to deprecated method.
- `feat`: new features, e.g. add new method to the module.
- `refactor`: code refactor, e.g. migrate from class components to hooks.
- `docs`: changes into documentation, e.g. add usage example for the module..
- `test`: adding or updating tests, e.g. add integration tests using detox.
- `chore`: tooling changes, e.g. change CI config.

Our pre-commit hooks verify that your commit message matches this format when committing.

### Linting and tests

[ESLint](https://eslint.org/), [Prettier](https://prettier.io/), [TypeScript](https://www.typescriptlang.org/)

We use [TypeScript](https://www.typescriptlang.org/) for type checking, [ESLint](https://eslint.org/) with [Prettier](https://prettier.io/) for linting and formatting the code, and [Jest](https://jestjs.io/) for testing.

Our pre-commit hooks verify that the linter and tests pass when committing.

### Publishing to npm

We use [release-it](https://github.com/release-it/release-it) to make it easier to publish new versions. It handles common tasks like bumping version based on semver, creating tags and releases etc.

To publish new versions, run the following:

```sh
npm run release
```

### Scripts

The `package.json` file contains various scripts for common tasks:

- `npm run bootstrap`: setup project by installing all dependencies and pods.
- `npm run typecheck`: type-check files with TypeScript.
- `npm run lint`: lint files with ESLint.
- `npm run test`: run unit tests with Jest.
- `npm run example`: start the Metro server for the example app.
- `npm run build`: build the library.