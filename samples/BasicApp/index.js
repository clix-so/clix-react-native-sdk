import Clix, { ClixLogLevel } from '@clix-so/react-native-sdk';
import { AppRegistry } from 'react-native';
import { name as appName } from './app.json';
import App from './src/App';
import { ClixInfo } from './src/ClixInfo';

Clix.initialize({
  projectId: ClixInfo.projectId,
  apiKey: ClixInfo.apiKey,
  logLevel: ClixLogLevel.DEBUG,
});

AppRegistry.registerComponent(appName, () => App);
