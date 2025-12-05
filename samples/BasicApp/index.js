import Clix from '@clix-so/react-native-sdk';
import { AppRegistry } from 'react-native';
import { name as appName } from './app.json';
import App from './src/App';
import config from './src/assets/clix_config.json';

Clix.initialize(config);

AppRegistry.registerComponent(appName, () => App);
