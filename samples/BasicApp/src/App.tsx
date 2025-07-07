/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import Clix, { ClixLogLevel } from '@clix/react-native-sdk';
import messaging from '@react-native-firebase/messaging';
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
  const [notificationPermission, setNotificationPermission] =
    useState<string>('not-determined');
  const [lastNotification, setLastNotification] = useState<any>(null);

  const projectId = ClixInfo.projectId;
  const apiKey = ClixInfo.apiKey;

  useEffect(() => {
    const initializeSDK = async () => {
      try {
        // Use a fallback log level if ClixLogLevel.Debug is not available
        const logLevel = ClixLogLevel?.DEBUG ?? 4; // 4 is Debug level

        console.info('ClixLogLevel available:', !!ClixLogLevel);
        console.info('ClixLogLevel.Debug value:', ClixLogLevel?.DEBUG);

        // Initialize Clix SDK without push notification handlers
        await Clix.initialize({
          projectId: ClixInfo.projectId,
          apiKey: ClixInfo.apiKey,
          logLevel: logLevel,
        });

        // Get device information after initialization
        const currentDeviceId = await Clix.getDeviceId();
        const currentPushToken = await Clix.getPushToken();

        // Update state with null if values are undefined
        setDeviceId(currentDeviceId || null);
        setPushToken(currentPushToken || null);
        
        // Firebase handles notification permissions now
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;
        
        setNotificationPermission(
          enabled ? 'authorized' : 'denied'
        );
      } catch (error) {
        console.error('Failed to initialize Clix SDK:', error);
        Alert.alert('Error', `Failed to initialize Clix SDK: ${error}`);
      }
    };

    initializeSDK();

    // Set up Firebase messaging listeners
    const unsubscribeOnMessage = messaging().onMessage(
      async (remoteMessage) => {
        console.info('FCM Message received in foreground:', remoteMessage);
        Alert.alert(
          'New Notification',
          remoteMessage.notification?.body || 'You have a new message'
        );
        
        // Store last notification information
        setLastNotification({
          type: 'received',
          data: remoteMessage.data,
          timestamp: new Date().toISOString(),
        });
      }
    );
    
    // Listen for notification open events
    const unsubscribeOnNotificationOpened = messaging().onNotificationOpenedApp(
      (remoteMessage) => {
        console.info('Notification opened the app:', remoteMessage);
        
        // Store notification information for display
        setLastNotification({
          type: 'tapped',
          data: remoteMessage.data,
          timestamp: new Date().toISOString(),
        });
      }
    );

    return () => {
      unsubscribeOnMessage();
      unsubscribeOnNotificationOpened();
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

  const handleRequestPermission = async () => {
    try {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      
      setNotificationPermission(enabled ? 'authorized' : 'denied');

      if (enabled) {
        Alert.alert('Success', 'Notification permission granted');
        // Update push token after permission granted
        const token = await Clix.getPushToken();
        setPushToken(token || null);
      } else {
        Alert.alert(
          'Permission Denied',
          'Please enable notifications in settings'
        );
      }
    } catch (error) {
      console.error('Failed to request permission:', error);
      Alert.alert('Error', 'Failed to request notification permission');
    }
  };

  const handleSubscribeToTopic = async () => {
    try {
      await messaging().subscribeToTopic('test-topic');
      Alert.alert('Success', 'Subscribed to test-topic');
    } catch (error) {
      console.error('Failed to subscribe to topic:', error);
      Alert.alert('Error', 'Failed to subscribe to topic');
    }
  };

  const handleUnsubscribeFromTopic = async () => {
    try {
      await messaging().unsubscribeFromTopic('test-topic');
      Alert.alert('Success', 'Unsubscribed from test-topic');
    } catch (error) {
      console.error('Failed to unsubscribe from topic:', error);
      Alert.alert('Error', 'Failed to unsubscribe from topic');
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
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require('./assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Project Information */}
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

          <View style={styles.infoContainer}>
            <Text style={styles.label}>Notification Permission:</Text>
            <Text style={styles.infoText}>{notificationPermission}</Text>
          </View>

          {lastNotification && (
            <View style={styles.infoContainer}>
              <Text style={styles.label}>Last Notification:</Text>
              <Text style={styles.infoText}>
                Type: {lastNotification.type}
                {`\n`}Time: {lastNotification.timestamp}
                {`\n`}Data: {JSON.stringify(lastNotification.data, null, 2)}
              </Text>
            </View>
          )}

          {/* User ID Section */}
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

          {/* User Property Section */}
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

          {/* Notification Actions */}
          <View style={styles.notificationSection}>
            <Text style={[styles.label, styles.sectionTitle]}>
              Push Notifications
            </Text>

            {notificationPermission !== 'authorized' && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleRequestPermission}
              >
                <Text style={styles.buttonText}>Request Permission</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleSubscribeToTopic}
            >
              <Text style={styles.buttonText}>Subscribe to Test Topic</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleUnsubscribeFromTopic}
            >
              <Text style={styles.buttonText}>Unsubscribe from Test Topic</Text>
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
});

export default App;
