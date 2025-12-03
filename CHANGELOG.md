# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-12-03

- Added the `trackEvent` method
- Added the `Clix.Notification` facade that exposes permission requests, token retrieval, foreground/background handlers, and notification-open callbacks.
- Improved Notification Service Extension compatibility.

## [0.0.1] - 2025-09-18

### Added

- **Core SDK**

  - ClixConfig-based initialization with projectId, apiKey, endpoint configuration
  - Async/await API support
  - Thread-safe operations with automatic initialization handling

- **User Management**

  - User identification: `setUserId()`, `removeUserId()`
  - User properties: `setUserProperty()`, `setUserProperties()`, `removeUserProperty()`

- **Push Notifications**

  - Firebase Cloud Messaging integration
  - Notifee-based notification handling for foreground/background/cold-start and actions
  - Rich notifications with images on supported platforms
  - Automatic device token management

- **Device & Logging**

  - Device information access: `getDeviceId()`, `getPushToken()`
  - Configurable logging system with 5 levels (none to debug)

- **Installation**
  - npm/Yarn installation with peer dependencies (`@react-native-firebase/messaging`, `@notifee/react-native`, `react-native-mmkv`, `react-native-device-info`, `react-native-get-random-values`, `uuid`)
  - React Native 0.60+, iOS 14.0+ and Android 5.0+ (API 21)
  - Sample app with complete integration example
