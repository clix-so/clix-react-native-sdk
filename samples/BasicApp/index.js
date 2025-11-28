import Clix, { ClixLogLevel } from '@clix-so/react-native-sdk';
import { AppRegistry } from 'react-native';
import { name as appName } from './app.json';
import App from './src/App';

Clix.initialize({
  projectId: '5dbdd10e-6ea6-4ff7-836d-bd30a6d1a521',
  apiKey: 'clix_pk_A0wRnlwQT64tgL1BuMxZKlt_8_SvfA',
  logLevel: ClixLogLevel.DEBUG,
  endpoint: 'https://external-api-dev.clix.so',
  extraHeaders: {
    'Cf-Access-Token':
      'eyJhbGciOiJSUzI1NiIsImtpZCI6IjBlMmJmNTNlN2Y3MmY2Zjg3NDY1ZTk3ODM5ZmY2NDMwOTBkMDYxMDZiYjUyOGM3MzI2YWI5OGMzNjc2N2IyYTEifQ.eyJhdWQiOlsiODAzYjE3NDhhOTVlNzc5YjMyOTMxYjZlNjlmMDhjMjNhYTUzNTAwMDc0YmE2YmQ4ZjVhODg4MTg5YWU2ZTYwMCJdLCJlbWFpbCI6Imh5ZW9uamlAZ3JleWJveGhxLmNvbSIsImV4cCI6MTc2NDY1ODA4OCwiaWF0IjoxNzY0MDUzMjg4LCJuYmYiOjE3NjQwNTMyODgsImlzcyI6Imh0dHBzOi8vZ3JleWJveC5jbG91ZGZsYXJlYWNjZXNzLmNvbSIsInR5cGUiOiJhcHAiLCJpZGVudGl0eV9ub25jZSI6IkllVHhCMExyNTN0VEFEbU0iLCJzdWIiOiJlMjQyZmFjNC1hZmY5LTU3NjctOGZjMC01ZDc0MzY2NzBiZTkiLCJjb3VudHJ5IjoiS1IifQ.REBHfS2-JYK-l0zyKVgtBNu364aq7zd1DOEOdMdad7XqV8XrV8RxhCLYJalaWTcgJ_6rsGSTcvCD6M8wyorvMe7FvBsum9oZVRS16owXTwurMbL8b2dvDq_-WRYMx74RKex4LUHK9cM15N72yj8vuZyDZzLsENzTBFtNlg3E2ZrXLiuU4zo8tcmeiODoMGM2JYBtj5HFw3wr8hhUu3BzmBiBukABt4HEsNz10oeywmaDQxr8gaTQxJXdMB3hToUMlrxobugkJGJXhr6ZQh_5-W8pR1uNpfTNe6WHfKnSBcHBepRlIukvqRiJfBtozPCiqxjfLSdfqiYYgFbI2LLl6A',
  },
});

AppRegistry.registerComponent(appName, () => App);
