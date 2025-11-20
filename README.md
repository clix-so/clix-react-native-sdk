# Clix React Native SDK

Clix React Native SDK is a powerful tool for managing push notifications and user events in your React Native application. It provides a simple and intuitive interface for user engagement and analytics.

## Installation

### 1. Install the SDK

```bash
npm install @clix-so/react-native-sdk
```

Or using Yarn:
```bash
yarn add @clix-so/react-native-sdk
```

### 2. Install Required Dependencies

You must install all required peer dependencies:

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

### 3. Version Compatibility

**react-native-mmkv Version Selection (Critical)**

This SDK supports multiple versions of react-native-mmkv to ensure compatibility across different React Native versions:

| React Native Version | Architecture | Recommended MMKV Version | Notes |
|---------------------|-------------|--------------------------|-------|
| **0.70-0.73** | Old Architecture | `^2.12.2` | Stable, well-tested |
| **0.74+** | New Architecture | `^3.0.0` or `^4.0.0` | Requires TurboModules enabled |
| **0.75+** | Old/New Architecture | `^4.0.0` | Full Nitro support |

**Flexible Installation**: This SDK's `peerDependencies` allows `react-native-mmkv` versions `^2.12.2 || ^3.0.0 || ^4.0.0`, so you can choose the version that matches your React Native setup. The StorageService automatically detects and uses the correct API for your installed version.

**Example installations:**
```bash
# For React Native 0.70-0.73 (Old Architecture)
npm install react-native-mmkv@^2.12.2

# For React Native 0.74+ (New Architecture)
npm install react-native-mmkv@^3.0.0
# or
npm install react-native-mmkv@^4.0.0

# For React Native 0.75+ (Recommended)
npm install react-native-mmkv@^4.0.1
```

⚠️ **Important Notes**:
- MMKV v3.x and v4.x (on RN 0.74) require React Native's New Architecture (TurboModules) to be enabled
- MMKV v4.x on RN 0.75+ supports both architectures with Nitro
- The SDK automatically detects which MMKV API version is available and uses the appropriate interface

**Additional Setup for MMKV v4.x**:

When using MMKV v4.0.0 or higher, you must also install `react-native-nitro-modules`:

```bash
npm install react-native-nitro-modules
# or
yarn add react-native-nitro-modules
```

**iOS Pod Installation Troubleshooting**:

If you encounter pod installation errors with MMKV v4.x, add the following line to your `ios/Podfile` after the `prepare_react_native_project!` line:

```ruby
platform :ios, min_ios_version_supported
prepare_react_native_project!

# Add this line for MMKV v4.x compatibility
use_frameworks! :linkage => :static
```

This configures CocoaPods to use static frameworks, which resolves compatibility issues with Nitro modules. For more details, see the [MMKV V4 Troubleshooting Guide](https://github.com/mrousavy/react-native-mmkv/blob/main/docs/V4_UPGRADE_GUIDE.md#troubleshooting).

**Important Setup Note**: uuid requires react-native-get-random-values polyfill:
```javascript
import 'react-native-get-random-values'; // Must be imported first
import { v4 as uuidv4 } from 'uuid';
```

## Requirements

- React Native 0.60.0 or later
- iOS 14.0+ / Android API 21+
- TypeScript 4.0+ (optional but recommended)

## Usage

### Initialization

Initialize the SDK with a ClixConfig. The config is required and contains your project settings.

```typescript
import Clix, { ClixLogLevel } from '@clix-so/react-native-sdk';

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

**Complete Firebase Setup**: Follow the comprehensive setup guide at [React Native Firebase](https://rnfirebase.io/), which includes:

- Creating a Firebase project
- Adding your app to Firebase
- Installing configuration files (`google-services.json` for Android, `GoogleService-Info.plist` for iOS)
- Platform-specific setup for push notifications
- Enabling Firebase Cloud Messaging in your Firebase console

For push notifications specifically, ensure you complete the [Messaging setup guide](https://rnfirebase.io/messaging/usage).

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