import { StyleSheet, TouchableOpacity, Text } from 'react-native';

export const renderButtonView = (title: string, onPress: () => void) => {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress} key={title}>
      <Text style={styles.buttonText}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 5,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});
