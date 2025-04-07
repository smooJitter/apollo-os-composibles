// Test script for subscription API client
import subscriptionClient from './modules/subscription/api-client.js';

async function testSubscriptionClient() {
  try {
    console.log('Testing SubscriptionApiClient...');
    
    // Test 0: Health check
    console.log('\n0. Checking API server health:');
    
    // Simple health check
    const health = await subscriptionClient.checkHealth();
    console.log('Health summary:');
    console.log('- Status:', health.status);
    console.log('- Database:', health.database);
    console.log('- Collections:', 
      `Plans: ${health.collections.plans}, ` +
      `Subscriptions: ${health.collections.subscriptions}`
    );
    console.log('- Server uptime:', health.uptime, 'seconds');
    
    // Detailed health check
    console.log('\nDetailed health information:');
    const detailedHealth = await subscriptionClient.checkHealth(true);
    console.log(JSON.stringify(detailedHealth, null, 2));
    
    if (health.status !== 'healthy') {
      console.error('API server is not healthy! Tests may fail.');
      if (health.error) {
        console.error('Error:', health.error);
      }
    }
    
    // Test 1: Get all plans
    console.log('\n1. Getting all plans:');
    const plans = await subscriptionClient.getPlans();
    console.log(`Found ${plans.length} plans`);
    console.log('Plans:', plans.map(p => `${p.name} ($${p.price})`));
    
    if (plans.length === 0) {
      console.error('No plans found. Make sure the subscription API is running and plans are initialized');
      return;
    }
    
    // Test 2: Get a specific plan
    const planId = plans[0]._id;
    console.log(`\n2. Getting plan details for ${planId}:`);
    const planDetails = await subscriptionClient.getPlan(planId);
    console.log('Plan details:', planDetails.name, `($${planDetails.price})`);
    
    // Test 3: Create a subscription
    const testUserId = `test-user-${Date.now()}`;
    console.log(`\n3. Creating subscription for test user ${testUserId}:`);
    const subscription = await subscriptionClient.createSubscription(testUserId, planId);
    console.log('Created subscription:', {
      id: subscription._id,
      plan: planId,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      status: subscription.status
    });
    
    // Test 4: Get user subscription
    console.log(`\n4. Getting subscription for user ${testUserId}:`);
    const userSubscription = await subscriptionClient.getUserSubscription(testUserId);
    if (userSubscription) {
      console.log('User subscription:', {
        id: userSubscription._id,
        planName: userSubscription.planId.name,
        endDate: userSubscription.endDate,
        status: userSubscription.status
      });
    } else {
      console.log('No active subscription found for user');
    }
    
    // Test 5: Try to get subscription for non-existent user
    const nonExistentUserId = 'non-existent-user';
    console.log(`\n5. Getting subscription for non-existent user ${nonExistentUserId}:`);
    const nonExistentUserSubscription = await subscriptionClient.getUserSubscription(nonExistentUserId);
    console.log('Result:', nonExistentUserSubscription === null ? 'Correctly returned null' : 'Unexpected result');
    
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Error in tests:', error);
  }
}

// Run the tests
testSubscriptionClient(); 