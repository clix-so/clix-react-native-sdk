/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import {
  StatusBar,
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  useColorScheme,
  SafeAreaView,
  Alert,
} from 'react-native';
import Clix, { ClixLogLevel } from '@clix/react-native-sdk';
import { ClixInfo } from './ClixInfo';
import { useState, useEffect } from 'react';

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
        // Use a fallback log level if ClixLogLevel.Debug is not available
        const logLevel = ClixLogLevel?.Debug ?? 4; // 4 is Debug level

        console.log('ClixLogLevel available:', !!ClixLogLevel);
        console.log('ClixLogLevel.Debug value:', ClixLogLevel?.Debug);

        await Clix.initialize({
          projectId: ClixInfo.projectId,
          apiKey: ClixInfo.apiKey,
          logLevel: logLevel,
        });

        // Get device information after initialization
        const currentDeviceId = await Clix.getDeviceId();
        const currentPushToken = await Clix.getPushToken();

        setDeviceId(currentDeviceId);
        setPushToken(currentPushToken);
      } catch (error) {
        console.error('Failed to initialize Clix SDK:', error);
        Alert.alert('Error', `Failed to initialize Clix SDK: ${error}`);
      }
    };

    initializeSDK();
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
            <Text style={styles.infoText}>{pushToken}</Text>
          </View>

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
});

export default App;
