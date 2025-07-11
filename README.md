# @clix/react-native-sdk

Clix SDK for React Native

## Installation

### From GitHub Packages

```sh
npm install @clix/react-native-sdk
```

**Note**: This package is published to GitHub Packages. If you encounter authentication issues, you may need to configure npm to use GitHub Packages:

```sh
npm login --scope=@clix --registry=https://npm.pkg.github.com
```

Or create a `.npmrc` file in your project:

```
@clix:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

## Usage

### Basic Setup

```js
import { Clix } from '@clix/react-native-sdk';

// Initialize Clix SDK
await Clix.initialize({
  apiKey: 'your-api-key',
  // other configuration options
});
```

### Push Notifications Setup

#### 1. Background Message Handler Setup

**Important**: The background message handler must be set up outside of your application lifecycle, typically in your `index.js` file:

```js
// index.js
import { AppRegistry } from 'react-native';
import { name as appName } from './app.json';
import App from './src/App';
import { NotificationService } from '@clix/react-native-sdk';

// Setup background message handler outside of application lifecycle
NotificationService.setupBackgroundMessageHandler();

AppRegistry.registerComponent(appName, () => App);
```

#### 2. Foreground Notification Handling

The foreground notification handling is automatically set up when you initialize the Clix SDK. The `NotificationService` handles:

- Permission requests
- Token management
- Foreground message handling
- Notification display
- Event tracking

#### 3. Notification Service Features

The `NotificationService` is now split into two parts:

- **Static Background Handler**: Handles messages when the app is in background or terminated
- **Instance Foreground Handler**: Handles messages when the app is in foreground

Key features:
- Automatic permission handling
- Token refresh management
- Local notification display
- Event tracking for analytics
- Background notification storage

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)