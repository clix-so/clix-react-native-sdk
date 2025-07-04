import React from 'react';
import { StyleSheet, ScrollView, Text, View } from 'react-native';

interface ClixConsoleProps {
  value: string;
}

const ClixConsole: React.FC<ClixConsoleProps> = ({ value }) => {
  return (
    <View style={styles.console}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.text}>{value}</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  console: {
    height: 200,
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 10,
    marginVertical: 10,
  },
  scrollView: {
    flex: 1,
  },
  text: {
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: 12,
  },
});

export default ClixConsole;
