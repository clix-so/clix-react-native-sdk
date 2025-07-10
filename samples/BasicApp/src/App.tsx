/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import Clix, { ClixLogLevel } from '@clix/react-native-sdk';
import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { ClixInfo } from './ClixInfo';

function App() {
  // Theme configuration
  useColorScheme();
  const [userId, setUserId] = useState('');
  const [propertyKey, setPropertyKey] = useState('');
  const [propertyValue, setPropertyValue] = useState('');
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [pushToken, setPushToken] = useState<string | null>(null);

  const projectId = ClixInfo.projectId;
  const apiKey = ClixInfo.apiKey;

  useEffect(() => {
    const initializeSDK = async () => {
      try {
        // Initialize Clix SDK
        await Clix.initialize({
          projectId: projectId,
          apiKey: apiKey,
          logLevel: ClixLogLevel.DEBUG,
        });
        // messaging().onMessage(async (remoteMessage) => {
        //   console.log(JSON.stringify(remoteMessage));
        // });

        // Use a fallback log level if ClixLogLevel.Debug is not available
        try {
          const currentDeviceId = await Clix.getDeviceId();
          const currentPushToken = await Clix.getPushToken();

          // Update state with null if values are undefined
          setDeviceId(currentDeviceId || null);
          setPushToken(currentPushToken || null);
        } catch (deviceError) {
          console.warn(
            'Failed to get device info immediately after init:',
            deviceError
          );
          // Set placeholders and try again later
          setDeviceId('Loading...');
          setPushToken('Loading...');

          // Retry after a delay
          setTimeout(async () => {
            try {
              const currentDeviceId = await Clix.getDeviceId();
              const currentPushToken = await Clix.getPushToken();
              setDeviceId(currentDeviceId || null);
              setPushToken(currentPushToken || null);
            } catch (retryError) {
              console.error('Failed to get device info on retry:', retryError);
              setDeviceId('Error loading');
              setPushToken('Error loading');
            }
          }, 1000);
        }
      } catch (error) {
        console.error('Failed to initialize Clix SDK:', error);
        Alert.alert('Error', `Failed to initialize Clix SDK: ${error}`);
      }
    };

    initializeSDK();

    // Note: Clix SDK handles all notification logic internally
    // No need to set up listeners as the SDK manages everything
    // The SDK will automatically handle:
    // - Foreground message display
    // - Background message handling
    // - Notification tap handling
    // - Token management
    // - Permission management

    return () => {
      // Cleanup handled by Clix SDK
    };
  }, []);

  const handleSubmitUserId = async () => {
    if (!userId.trim()) {
      Alert.alert('Error', 'Please enter a user ID');
      return;
    }

    try {
      await Clix.setUserId(userId);
      Alert.alert('Success', 'User ID set successfully');
      setUserId('');
    } catch (error) {
      console.error('Failed to set user ID:', error);
      Alert.alert('Error', 'Failed to set user ID');
    }
  };

  const handleSetUserProperty = async () => {
    if (!propertyKey.trim() || !propertyValue.trim()) {
      Alert.alert('Error', 'Please enter both property key and value');
      return;
    }

    try {
      await Clix.setUserProperty(propertyKey, propertyValue);
      Alert.alert('Success', `Property set: ${propertyKey} = ${propertyValue}`);
      setPropertyKey('');
      setPropertyValue('');
    } catch (error) {
      console.error('Failed to set property:', error);
      Alert.alert('Error', 'Failed to set property');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={styles.scrollView}
      >
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Image
              source={require('./assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.infoContainer}>
            <Text style={styles.label}>Project ID:</Text>
            <Text style={styles.infoText}>{projectId}</Text>
          </View>

          <View style={styles.infoContainer}>
            <Text style={styles.label}>API Key:</Text>
            <Text style={styles.infoText}>{apiKey}</Text>
          </View>

          <View style={styles.infoContainer}>
            <Text style={styles.label}>Device ID:</Text>
            <Text style={styles.infoText}>{deviceId}</Text>
          </View>

          <View style={styles.infoContainer}>
            <Text style={styles.label}>Push Token:</Text>
            <Text style={styles.infoText}>{pushToken || 'Not available'}</Text>
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.label}>User ID</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={userId}
                onChangeText={setUserId}
                placeholder=""
                placeholderTextColor="#666"
              />
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmitUserId}
              >
                <Text style={styles.buttonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.label}>User Property Key</Text>
            <TextInput
              style={styles.fullInput}
              value={propertyKey}
              onChangeText={setPropertyKey}
              placeholder="Enter property key"
              placeholderTextColor="#666"
            />
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.label}>User Property Value</Text>
            <TextInput
              style={styles.fullInput}
              value={propertyValue}
              onChangeText={setPropertyValue}
              placeholder="Enter property value"
              placeholderTextColor="#666"
            />
          </View>

          <TouchableOpacity
            style={styles.setPropertyButton}
            onPress={handleSetUserProperty}
          >
            <Text style={styles.buttonText}>Set User Property</Text>
          </TouchableOpacity>

          {/* 🔍 디버깅 버튼들 추가 */}
          <View style={styles.debugSection}>
            <Text style={styles.debugTitle}>🔍 Push Notification Debug</Text>

            <TouchableOpacity
              style={styles.debugButton}
              onPress={async () => {
                try {
                  console.log('🔍 Manual debug triggered');
                  // @ts-ignore
                  await Clix.debugPushNotifications();
                  Alert.alert('Debug', 'Push debug completed - check logs!');
                } catch (error) {
                  console.error('Debug failed:', error);
                  Alert.alert('Error', 'Debug failed: ' + error);
                }
              }}
            >
              <Text style={styles.buttonText}>Debug Push Setup</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.debugButton}
              onPress={async () => {
                try {
                  console.log('🔄 Manual handler refresh triggered');
                  // @ts-ignore
                  await Clix.refreshPushHandlers();
                  Alert.alert('Refresh', 'Handlers refreshed - check logs!');
                } catch (error) {
                  console.error('Refresh failed:', error);
                  Alert.alert('Error', 'Refresh failed: ' + error);
                }
              }}
            >
              <Text style={styles.buttonText}>Refresh Handlers</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.debugButton}
              onPress={async () => {
                try {
                  console.log('🌍 Global FCM check triggered');
                  // @ts-ignore
                  await Clix.checkFCMStatus();
                  Alert.alert('FCM Check', 'FCM status checked - see logs!');
                } catch (error) {
                  console.error('FCM check failed:', error);
                  Alert.alert('Error', 'FCM check failed: ' + error);
                }
              }}
            >
              <Text style={styles.buttonText}>Check FCM Status</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
  },
  infoContainer: {
    marginBottom: 20,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    color: '#999',
    fontSize: 14,
    lineHeight: 20,
  },
  inputSection: {
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#333',
    color: '#fff',
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
  },
  fullInput: {
    backgroundColor: '#333',
    color: '#fff',
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 8,
  },
  setPropertyButton: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  notificationSection: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: '#666',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  debugSection: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  debugTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 15,
    textAlign: 'center',
  },
  debugButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
});

export default App;
