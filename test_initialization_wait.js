const { Clix } = require('./lib/module/index');

async function testInitializationWait() {
  console.log(
    'Starting test: Methods called before initialization should wait...'
  );

  // Start multiple method calls before initialization
  const promises = [];

  // These should all wait for initialization
  promises.push(
    Clix.setUserId('test-user-1').then(() =>
      console.log('✓ setUserId completed')
    )
  );

  promises.push(
    Clix.setUserProperty('test-key', 'test-value').then(() =>
      console.log('✓ setUserProperty completed')
    )
  );

  promises.push(
    Clix.getDeviceId().then((deviceId) =>
      console.log('✓ getDeviceId completed:', deviceId)
    )
  );

  // Wait a bit to ensure the methods are waiting
  await new Promise((resolve) => setTimeout(resolve, 500));
  console.log('Methods are waiting for initialization...');

  // Now initialize the SDK
  console.log('Calling Clix.initialize()...');
  const config = {
    projectId: 'test-project',
    apiKey: 'test-api-key',
    endpoint: 'https://api.clix.so',
    logLevel: 'INFO',
  };

  try {
    await Clix.initialize(config);
    console.log('✓ Clix.initialize() completed');

    // Wait for all the pending method calls to complete
    await Promise.all(promises);
    console.log('✓ All methods completed successfully');
  } catch (error) {
    console.error('✗ Test failed:', error);
  }
}

// Run the test
testInitializationWait().catch(console.error);
