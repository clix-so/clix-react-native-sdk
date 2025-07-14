# Clix React Native SDK

Clix React Native SDK is a powerful tool for managing push notifications and user events in your React Native application. It provides a simple and intuitive interface for user engagement and analytics.

## Installation

Add this to your package's `package.json` file:
```sh
npm install @clix-so/react-native-sdk
```

Or using Yarn:

```sh
yarn add @clix-so/react-native-sdk
```

## Requirements

- React Native 0.60.0 or later
- iOS 14.0+ / Android API 21+
- TypeScript 4.0+ (optional but recommended)

## Dependency Version Compatibility

### react-native-mmkv Version Selection (Critical)

**react-native-mmkv** has different versions based on React Native version and architecture:

| React Native Version | Architecture | react-native-mmkv Version |
|---------------------|-------------|---------------------------|
| **0.70-0.73** | Old Architecture | `^2.12.2` |
| **0.74+** | New Architecture | `^3.0.1+` |

⚠️ **New Architecture Requirement**: react-native-mmkv v3.x requires React Native's New Architecture (TurboModules) to be enabled.

### Install Peer Dependencies

You must install all required peer dependencies alongside this SDK:

```bash
npm install @notifee/react-native @react-native-firebase/app @react-native-firebase/messaging react-native-device-info react-native-get-random-values react-native-mmkv uuid
```

Or using Yarn:

```bash
yarn add @notifee/react-native @react-native-firebase/app @react-native-firebase/messaging react-native-device-info react-native-get-random-values react-native-mmkv uuid
```

Or using Expo:

```bash
npx expo install @notifee/react-native @react-native-firebase/app @react-native-firebase/messaging react-native-device-info react-native-get-random-values react-native-mmkv uuid
```

**Note**: Use the appropriate react-native-mmkv version based on your React Native version (see compatibility table above).

## Usage

### Initialization

Initialize the SDK with a ClixConfig. The config is required and contains your project settings.

```typescript
import Clix, { ClixLogLevel } from '@clix-so/react-native-sdk';

// Initialize Firebase first
await messaging().registerDeviceForRemoteMessages();

// Initialize Clix SDK
await Clix.initialize({
  projectId: 'YOUR_PROJECT_ID',
  apiKey: 'YOUR_API_KEY',
  logLevel: ClixLogLevel.DEBUG, // Optional: set log level
});
```

### User Management

```typescript
// Set user ID
await Clix.setUserId('user123');

// Set user properties
await Clix.setUserProperty('name', 'John Doe');
await Clix.setUserProperties({
  age: 25,
  premium: true,
  subscription_plan: 'pro',
});

// Remove user properties
await Clix.removeUserProperty('name');
await Clix.removeUserProperties(['age', 'premium']);

// Remove user ID
await Clix.removeUserId();
```

### Logging

```typescript
Clix.setLogLevel(ClixLogLevel.DEBUG);
// Available log levels:
// - 'none': No logs
// - 'error': Error logs only
// - 'warning': Warning logs
// - 'info': Info logs
// - 'debug': Debug logs
// - 'verbose': All logs
```

### Push Notification Integration

The Clix React Native SDK automatically handles push notification integration through Firebase Cloud Messaging.

#### Setup Firebase

1. **Add Firebase to your React Native project**
   - Follow the [React Native Firebase setup guide](https://rnfirebase.io/)
   - Add `google-services.json` (Android) and `GoogleService-Info.plist` (iOS)

2. **Enable Push Notifications**
   - For iOS: Enable Push Notifications capability in Xcode
   - For Android: No additional setup required

3. **Add required dependencies**

```json
"dependencies": {
  "@notifee/react-native": "*",
  "@react-native-firebase/app": "^19.3.0",
  "@react-native-firebase/messaging": "^19.3.0",
  "react-native-device-info": "*",
  "react-native-get-random-values": "*",
  "react-native-mmkv": "*",
  "uuid": "*"
}
```

#### Background Message Handler Setup

**Important**: The background message handler must be set up outside of your application lifecycle, typically in your `index.js` file:

```typescript
// index.js
import { AppRegistry } from 'react-native';
import { name as appName } from './app.json';
import App from './src/App';
import { NotificationService } from '@clix-so/react-native-sdk';

// Setup background message handler outside of application lifecycle
NotificationService.setupBackgroundMessageHandler();

AppRegistry.registerComponent(appName, () => App);
```

#### Handling Notifications

The SDK automatically handles notification registration and token management. Notifications are processed internally for analytics and tracking.

```typescript
// Notification handling is automatic - no additional code required
// The SDK will track notification delivery and engagement automatically
```

## Firebase Setup

### iOS Setup

1. Add your `GoogleService-Info.plist` to the iOS project in Xcode
2. Enable Push Notifications capability in your iOS project
3. Add Background Modes capability and check "Remote notifications"
4. Update your `ios/Podfile`:

```ruby
platform :ios, '14.0'
```

5. Run `cd ios && pod install`

### Android Setup

1. Add your `google-services.json` to `android/app/`
2. Add the Google Services plugin to your `android/build.gradle`:

```gradle
buildscript {
    dependencies {
        classpath 'com.google.gms:google-services:4.3.15'
    }
}
```

3. Apply the plugin in `android/app/build.gradle`:

```gradle
apply plugin: 'com.google.gms.google-services'
```

## Configuration Options

### ClixConfig

- `projectId` (required): Your Clix project ID
- `apiKey` (required): Your Clix API key  
- `endpoint`: API endpoint (default: 'https://api.clix.so')
- `logLevel`: Logging level (default: 'error')
- `extraHeaders`: Additional HTTP headers for API requests

### Log Levels

- `verbose`: All logs including detailed debugging
- `debug`: Debug information and above
- `info`: General information and above
- `warning`: Warning messages and above
- `error`: Error messages only
- `none`: No logging

## Sample App

A comprehensive sample app is provided in the `samples/BasicApp` directory. The sample demonstrates:

- Basic Clix SDK integration
- Push notification handling with Firebase
- User property management
- Device information display

To run the sample:

1. Navigate to `samples/BasicApp`
2. Install dependencies: `npm install` or `yarn install`
3. Setup Firebase (add your config files)
4. Update `src/ClixInfo.ts` with your project details
5. Run the app:
   - iOS: `cd ios && pod install && cd .. && npx react-native run-ios`
   - Android: `npx react-native run-android`

## Error Handling

All SDK operations can throw `ClixError`. Always handle potential errors:

```typescript
try {
  await Clix.setUserId('user123');
} catch (error) {
  console.error('Failed to set user ID:', error);
}
```

## Thread Safety

The SDK is thread-safe and all operations can be called from any thread. Async operations will automatically wait for SDK initialization to complete.

## Advanced Features

### Notification Service Features

The `NotificationService` is split into two parts:

- **Static Background Handler**: Handles messages when the app is in background or terminated
- **Instance Foreground Handler**: Handles messages when the app is in foreground

Key features:
- Automatic permission handling
- Token refresh management
- Local notification display
- Event tracking for analytics
- Background notification storage

### Custom Properties

User properties support various data types:

```typescript
await Clix.setUserProperties({
  name: 'John Doe',           // String
  age: 25,                    // Number
  premium: true,              // Boolean
  tags: ['react-native', 'mobile'], // Array
  metadata: {                 // Object
    source: 'mobile_app',
    version: '1.0.0',
  },
});
```

## Platform-Specific Considerations

### iOS

- Requires iOS 14.0 or later
- Push notifications require user permission
- Background processing is automatically handled
- Ensure proper entitlements are configured

### Android

- Requires Android API level 21 or later
- Notification channels are automatically managed
- Background processing follows Android guidelines
- FCM token refresh is handled automatically

## Performance

- Lightweight initialization
- Efficient background processing
- Minimal memory footprint
- Optimized network requests
- Batched event processing

## Privacy

The SDK respects user privacy:
- Only collects necessary device information
- User data is handled according to your privacy policy
- Push tokens are managed securely
- No personal data is collected without consent

## TypeScript Support

The SDK is written in TypeScript and provides full type definitions:

```typescript
import { Clix, ClixConfig, ClixUserProperty } from '@clix-so/react-native-sdk';

const config: ClixConfig = {
  projectId: 'YOUR_PROJECT_ID',
  apiKey: 'YOUR_API_KEY',
};

const properties: Record<string, ClixUserProperty> = {
  name: 'John Doe',
  age: 25,
};
```

## License

This project is licensed under the MIT License with Custom Restrictions. See the [LICENSE](LICENSE) file for details.

## Changelog

See the full release history and changes in the [CHANGELOG.md](CHANGELOG.md) file.

## Contributing

We welcome contributions! Please read the [CONTRIBUTING.md](CONTRIBUTING.md) guide before submitting issues or pull requests.

## Support

For support and questions:
- Check the sample app for implementation examples
- Review the API documentation
- Contact support through your Clix dashboard

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)