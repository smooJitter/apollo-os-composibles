// test-subscription.js
import mongoose from 'mongoose';
import { Plan, Subscription } from './modules/subscription/schemas.js';

const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/apolloos_dev');
    console.log('Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    return false;
  }
};

const initPlans = async () => {
  try {
    const plans = await Plan.initializeDefaultPlans();
    console.log(`Initialized ${plans.length} default plans`);
    return plans;
  } catch (error) {
    console.error('Error initializing plans:', error);
    return [];
  }
};

const createTestSubscription = async (userId) => {
  try {
    // Find the free plan
    const freePlan = await Plan.findOne({ name: 'Free' });
    if (!freePlan) {
      console.error('Free plan not found');
      return null;
    }
    
    // Calculate end date (1 month from now for free plan)
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);
    
    // Create subscription
    const subscription = new Subscription({
      userId,
      planId: freePlan._id,
      startDate: new Date(),
      endDate,
      status: 'active',
      paymentProvider: 'none',
      autoRenew: true
    });
    
    await subscription.save();
    console.log(`Created subscription for user ${userId}`);
    return subscription;
  } catch (error) {
    console.error('Error creating subscription:', error);
    return null;
  }
};

const runTest = async () => {
  // Connect to MongoDB
  const connected = await connectDB();
  if (!connected) {
    return;
  }
  
  // Initialize plans
  const plans = await initPlans();
  
  // Create a test subscription for a sample user ID
  const testUserId = new mongoose.Types.ObjectId();
  const subscription = await createTestSubscription(testUserId);
  
  // List all plans
  const allPlans = await Plan.find();
  console.log('All plans:', allPlans);
  
  // List all subscriptions
  const allSubscriptions = await Subscription.find();
  console.log('All subscriptions:', allSubscriptions);
  
  // Disconnect from MongoDB
  await mongoose.disconnect();
  console.log('Disconnected from MongoDB');
};

// Run the test
runTest(); 