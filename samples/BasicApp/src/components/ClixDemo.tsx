import React from 'react';
import {
  Alert,
  StyleSheet,
  View,
  ScrollView,
  SafeAreaView,
  TextInput,
} from 'react-native';
import { Text } from 'react-native';
import Clix, { ClixLogLevel } from '@clix/react-native-sdk';
import ClixButtons from './ClixButtons';
import ClixConsole from './ClixConsole';
import { renderButtonView } from './Helpers';
import { ClixInfo } from '../ClixInfo';

interface Props {
  name: string;
}

interface State {
  name: string;
  consoleValue: string;
  inputValue: string;
}

class ClixDemo extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      name: props.name,
      inputValue: '',
      consoleValue: '',
    };
  }

  async componentDidMount() {
    try {
      await Clix.initialize({
        projectId: ClixInfo.projectId,
        apiKey: ClixInfo.apiKey,
        logLevel: ClixLogLevel.DEBUG,
      });
      this.clixLog('Clix SDK initialized successfully');

      // Get device information after initialization
      const deviceId = await Clix.getDeviceId();
      const pushToken = await Clix.getPushToken();

      this.clixLog(`Device ID: ${deviceId}`);
      this.clixLog(`Push Token: ${pushToken || 'Not available'}`);
    } catch (error) {
      this.clixLog('Failed to initialize Clix SDK: ' + error);
      Alert.alert('Error', 'Failed to initialize Clix SDK');
    }
  }

  clixLog = (message: string, optionalArg: any = null) => {
    let logMessage = message;

    if (optionalArg !== null) {
      if (typeof optionalArg === 'object') {
        try {
          logMessage += ' ' + JSON.stringify(optionalArg);
        } catch (e) {
          logMessage += ' [Object]';
        }
      } else {
        logMessage += ' ' + optionalArg;
      }
    }

    console.log(logMessage);

    let consoleValue;
    if (this.state.consoleValue) {
      consoleValue = `${this.state.consoleValue}\n${logMessage}`;
    } else {
      consoleValue = logMessage;
    }

    this.setState({ consoleValue });
  };

  inputChange = (text: string) => {
    this.setState({ inputValue: text });
  };

  render() {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{this.state.name}</Text>
          <ClixConsole value={this.state.consoleValue} />
          <View style={styles.clearButton}>
            {renderButtonView('Clear', () => {
              this.setState({ consoleValue: '' });
            })}
          </View>
          <TextInput
            style={styles.input}
            placeholder="Enter value..."
            placeholderTextColor="#666"
            onChangeText={this.inputChange}
            value={this.state.inputValue}
          />
        </View>
        <ScrollView style={styles.scrollView}>
          <ClixButtons
            loggingFunction={this.clixLog}
            inputFieldValue={this.state.inputValue}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    backgroundColor: '#000',
  },
  header: {
    flex: 0.4,
    padding: 10,
  },
  scrollView: {
    flex: 0.6,
    padding: 10,
  },
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
    alignSelf: 'center',
    paddingVertical: 10,
  },
  clearButton: {
    position: 'absolute',
    right: 20,
    top: 70,
  },
  input: {
    backgroundColor: '#333',
    borderRadius: 8,
    color: '#fff',
    fontSize: 16,
    padding: 15,
    marginTop: 10,
  },
});

export default ClixDemo;
