// subscription-api.js
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { Plan, Subscription } from './modules/subscription/schemas.js';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB
const connectDB = async () => {
  try {
    const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/apolloos_dev';
    await mongoose.connect(dbUri);
    console.log(`Connected to MongoDB: ${dbUri}`);
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    return false;
  }
};

// API Routes
app.get('/', (req, res) => {
  res.send(`
    <html>
      <body>
        <h1>Subscription API</h1>
        <p>API endpoints:</p>
        <ul>
          <li>GET /api/plans - List all plans</li>
          <li>GET /api/plans/:id - Get a specific plan</li>
          <li>POST /api/plans - Create a new plan</li>
          <li>GET /api/subscriptions/user/:userId - Get a user's active subscription</li>
          <li>POST /api/subscriptions - Create a new subscription</li>
          <li>POST /api/initialize-default-plans - Initialize default plans</li>
        </ul>
      </body>
    </html>
  `);
});

app.get('/api/plans', async (req, res) => {
  try {
    const plans = await Plan.find();
    res.json(plans);
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/plans/:id', async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    res.json(plan);
  } catch (error) {
    console.error('Error fetching plan:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/plans', async (req, res) => {
  try {
    const plan = new Plan(req.body);
    await plan.save();
    res.status(201).json(plan);
  } catch (error) {
    console.error('Error creating plan:', error);
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/subscriptions/user/:userId', async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ 
      userId: req.params.userId,
      status: 'active'
    }).populate('planId');
    
    if (!subscription) {
      return res.status(404).json({ error: 'Active subscription not found' });
    }
    res.json(subscription);
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/subscriptions', async (req, res) => {
  try {
    const { userId, planId } = req.body;
    
    // Find the plan
    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    
    // Calculate end date based on billing cycle
    const startDate = new Date();
    let endDate = new Date(startDate);
    
    switch (plan.billingCycle) {
      case 'monthly':
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case 'quarterly':
        endDate.setMonth(endDate.getMonth() + 3);
        break;
      case 'annual':
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
      case 'lifetime':
        // Set to 100 years in the future for "lifetime"
        endDate.setFullYear(endDate.getFullYear() + 100);
        break;
      default:
        endDate.setMonth(endDate.getMonth() + 1);
    }
    
    // Create subscription with calculated end date
    const subscription = new Subscription({
      userId,
      planId,
      startDate,
      endDate,
      status: 'active',
      paymentProvider: plan.price > 0 ? 'manual' : 'none',
      autoRenew: plan.price > 0
    });
    
    await subscription.save();
    res.status(201).json(subscription);
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/initialize-default-plans', async (req, res) => {
  try {
    const plans = await Plan.initializeDefaultPlans();
    res.json(plans);
  } catch (error) {
    console.error('Error initializing default plans:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', async (req, res) => {
  try {
    // Check MongoDB connection
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    // Check if we can access plans collection
    const plansCount = await Plan.countDocuments();
    
    // Check if we can access subscriptions collection
    const subsCount = await Subscription.countDocuments();
    
    // Get system info
    const memoryUsage = process.memoryUsage();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatus,
        collections: {
          plans: plansCount,
          subscriptions: subsCount
        }
      },
      system: {
        uptime: process.uptime(),
        memory: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024) + ' MB',
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB'
        },
        platform: process.platform,
        nodeVersion: process.version
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Start server
const PORT = process.env.SUBSCRIPTION_API_PORT || 4005;
const startServer = async () => {
  const connected = await connectDB();
  if (connected) {
    app.listen(PORT, () => {
      console.log(`Subscription API running on http://localhost:${PORT}`);
    });
  }
};

startServer(); 