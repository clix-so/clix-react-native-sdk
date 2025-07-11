import Clix from '@clix-so/react-native-sdk';
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
  useColorScheme();
  const [userId, setUserId] = useState('');
  const [propertyKey, setPropertyKey] = useState('');
  const [propertyValue, setPropertyValue] = useState('');
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [pushToken, setPushToken] = useState<string | null>(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        try {
          const currentDeviceId = await Clix.getDeviceId();
          const currentPushToken = await Clix.getPushToken();
          setDeviceId(currentDeviceId || null);
          setPushToken(currentPushToken || null);
        } catch (deviceError) {
          console.warn(
            'Failed to get device info immediately after init:',
            deviceError
          );
          setDeviceId('Loading...');
          setPushToken('Loading...');
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
    initialize();
    return () => {};
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
            <Text style={styles.infoText}>{ClixInfo.projectId}</Text>
          </View>

          <View style={styles.infoContainer}>
            <Text style={styles.label}>API Key:</Text>
            <Text style={styles.infoText}>{ClixInfo.apiKey}</Text>
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
