import Clix from '@clix-so/react-native-sdk';
import { AppRegistry } from 'react-native';
import { name as appName } from './app.json';
import App from './src/App';

Clix.initialize({
  projectId: '',
  apiKey: '',
});

AppRegistry.registerComponent(appName, () => App);
