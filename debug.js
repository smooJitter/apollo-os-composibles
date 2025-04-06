// debug.js - Simple script to test the user module in isolation
const ctx = {
  models: {
    User: {
      findById: (id) => Promise.resolve({ _id: id, name: 'Test User', email: 'test@example.com' }),
      findOne: (query) => Promise.resolve({ _id: '123', name: 'Test User', email: 'test@example.com' })
    },
    AuthToken: {}
  },
  logger: {
    info: console.info,
    debug: console.debug,
    error: console.error,
    warn: console.warn
  }
};

async function testModule() {
  console.log('Loading user module...');
  
  try {
    // Import the module
    const userModule = await import('./modules/user/index.js');
    console.log('Module imported successfully');
    
    // Create the module
    const module = userModule.default(ctx);
    console.log('Module created successfully');
    
    // Test module properties
    console.log('Module ID:', module.id);
    console.log('Module resolvers:', Object.keys(module.resolvers));
    
    // Test a resolver
    if (module.resolvers.Query.userHealth) {
      const result = module.resolvers.Query.userHealth();
      console.log('userHealth resolver result:', result);
    }
    
    console.log('Test completed successfully');
  } catch (error) {
    console.error('Error testing module:', error);
  }
}

// Run the test
testModule().catch(console.error); 