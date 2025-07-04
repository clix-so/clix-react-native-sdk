import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Clix from '@clix/react-native-sdk';
import { renderButtonView } from './Helpers';

interface ClixButtonsProps {
  loggingFunction: (message: string, optionalArg?: any) => void;
  inputFieldValue: string;
}

class ClixButtons extends React.Component<ClixButtonsProps> {
  createUserManagementButtons() {
    const { loggingFunction, inputFieldValue } = this.props;

    const setUserIdButton = renderButtonView('Set User ID', async () => {
      try {
        await Clix.setUserId(inputFieldValue);
        loggingFunction('User ID set successfully: ' + inputFieldValue);
      } catch (error) {
        loggingFunction('Failed to set user ID: ', error);
      }
    });

    const removeUserIdButton = renderButtonView('Remove User ID', async () => {
      try {
        await Clix.removeUserId();
        loggingFunction('User ID removed successfully');
      } catch (error) {
        loggingFunction('Failed to remove user ID: ', error);
      }
    });

    const getDeviceIdButton = renderButtonView('Get Device ID', async () => {
      try {
        const deviceId = await Clix.getDeviceId();
        loggingFunction('Device ID: ' + deviceId);
      } catch (error) {
        loggingFunction('Failed to get device ID: ', error);
      }
    });

    const getPushTokenButton = renderButtonView('Get Push Token', async () => {
      try {
        const pushToken = await Clix.getPushToken();
        loggingFunction('Push Token: ' + pushToken);
      } catch (error) {
        loggingFunction('Failed to get push token: ', error);
      }
    });

    return [
      setUserIdButton,
      removeUserIdButton,
      getDeviceIdButton,
      getPushTokenButton,
    ];
  }

  createUserPropertiesButtons() {
    const { loggingFunction, inputFieldValue } = this.props;

    const setPropertyButton = renderButtonView(
      'Set Property with key "my_property"',
      async () => {
        try {
          await Clix.setUserProperty('my_property', inputFieldValue);
          loggingFunction(`Property set: my_property = ${inputFieldValue}`);
        } catch (error) {
          loggingFunction('Failed to set property: ', error);
        }
      }
    );

    const removePropertyButton = renderButtonView(
      'Remove Property with key "my_property"',
      async () => {
        try {
          await Clix.removeUserProperty('my_property');
          loggingFunction('Property removed: my_property');
        } catch (error) {
          loggingFunction('Failed to remove property: ', error);
        }
      }
    );

    const setMultiplePropertiesButton = renderButtonView(
      'Set Multiple Properties',
      async () => {
        try {
          await Clix.setUserProperties({
            prop1: 'value1',
            prop2: 'value2',
            prop3: inputFieldValue,
          });
          loggingFunction('Multiple properties set successfully');
        } catch (error) {
          loggingFunction('Failed to set multiple properties: ', error);
        }
      }
    );

    const removeMultiplePropertiesButton = renderButtonView(
      'Remove Multiple Properties',
      async () => {
        try {
          await Clix.removeUserProperties(['prop1', 'prop2']);
          loggingFunction('Multiple properties removed successfully');
        } catch (error) {
          loggingFunction('Failed to remove multiple properties: ', error);
        }
      }
    );

    return [
      setPropertyButton,
      removePropertyButton,
      setMultiplePropertiesButton,
      removeMultiplePropertiesButton,
    ];
  }

  createEventTrackingButtons() {
    const { loggingFunction, inputFieldValue } = this.props;

    const trackEventButton = renderButtonView('Track Event', async () => {
      try {
        await Clix.trackEvent(inputFieldValue || 'default_event');
        loggingFunction(`Event tracked: ${inputFieldValue || 'default_event'}`);
      } catch (error) {
        loggingFunction('Failed to track event: ', error);
      }
    });

    const trackEventWithPropertiesButton = renderButtonView(
      'Track Event With Properties',
      async () => {
        try {
          await Clix.trackEvent(inputFieldValue || 'default_event', {
            properties: {
              property1: 'value1',
              property2: 'value2',
            },
          });
          loggingFunction(
            `Event with properties tracked: ${
              inputFieldValue || 'default_event'
            }`
          );
        } catch (error) {
          loggingFunction('Failed to track event with properties: ', error);
        }
      }
    );

    return [trackEventButton, trackEventWithPropertiesButton];
  }

  createLogLevelButtons() {
    const { loggingFunction } = this.props;

    const setLogLevelNoneButton = renderButtonView(
      'Set Log Level: None',
      () => {
        Clix.setLogLevel(0);
        loggingFunction('Log level set to None');
      }
    );

    const setLogLevelErrorButton = renderButtonView(
      'Set Log Level: Error',
      () => {
        Clix.setLogLevel(1);
        loggingFunction('Log level set to Error');
      }
    );

    const setLogLevelWarnButton = renderButtonView(
      'Set Log Level: Warn',
      () => {
        Clix.setLogLevel(2);
        loggingFunction('Log level set to Warn');
      }
    );

    const setLogLevelInfoButton = renderButtonView(
      'Set Log Level: Info',
      () => {
        Clix.setLogLevel(3);
        loggingFunction('Log level set to Info');
      }
    );

    const setLogLevelDebugButton = renderButtonView(
      'Set Log Level: Debug',
      () => {
        Clix.setLogLevel(4);
        loggingFunction('Log level set to Debug');
      }
    );

    return [
      setLogLevelNoneButton,
      setLogLevelErrorButton,
      setLogLevelWarnButton,
      setLogLevelInfoButton,
      setLogLevelDebugButton,
    ];
  }

  render() {
    return (
      <View>
        <Text style={styles.sectionTitle}>User Management</Text>
        <View style={styles.divider} />
        {this.createUserManagementButtons()}

        <Text style={styles.sectionTitle}>User Properties</Text>
        <View style={styles.divider} />
        {this.createUserPropertiesButtons()}

        <Text style={styles.sectionTitle}>Event Tracking</Text>
        <View style={styles.divider} />
        {this.createEventTrackingButtons()}

        <Text style={styles.sectionTitle}>Log Level</Text>
        <View style={styles.divider} />
        {this.createLogLevelButtons()}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#555',
    marginVertical: 10,
  },
});

export default ClixButtons;
