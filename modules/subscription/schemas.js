import mongoose from 'mongoose';
const { Schema } = mongoose;
import { timestampsPlugin } from '../../config/shared-mongoose/plugins/timestamps.js';

/**
 * Plan schema definition
 * Represents subscription plans available in the system
 */
const planSchema = new Schema({
  name: { 
    type: String, 
    required: true,
    trim: true,
    unique: true 
  },
  price: { 
    type: Number, 
    required: true,
    min: 0 
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'quarterly', 'annual', 'lifetime'],
    default: 'monthly'
  },
  features: [String],
  description: { 
    type: String,
    trim: true 
  },
  isActive: {
    type: Boolean,
    default: true
  },
  tier: {
    type: Number,
    default: 0,
    min: 0
  },
  limits: {
    journalEntries: { type: Number, default: -1 }, // -1 means unlimited
    journals: { type: Number, default: -1 },
    storage: { type: Number, default: 100 } // MB
  },
  metadata: {
    displayColor: String,
    highlight: Boolean,
    mostPopular: Boolean
  }
});

// Apply plugins
planSchema.plugin(timestampsPlugin);

// Static methods
planSchema.statics.getActivePlans = function() {
  return this.find({ isActive: true }).sort({ tier: 1, price: 1 });
};

planSchema.statics.initializeDefaultPlans = async function() {
  const defaultPlans = [
    {
      name: 'Free',
      price: 0,
      billingCycle: 'monthly',
      features: ['5 journals', '50 entries per journal', 'Basic analytics'],
      description: 'Start your journey for free',
      tier: 0,
      limits: {
        journals: 5,
        journalEntries: 50,
        storage: 50
      },
      metadata: {
        displayColor: '#4CAF50',
        highlight: false,
        mostPopular: false
      }
    },
    {
      name: 'Basic',
      price: 4.99,
      billingCycle: 'monthly',
      features: ['10 journals', '200 entries per journal', 'Advanced analytics', 'Priority support'],
      description: 'Perfect for dedicated journalers',
      tier: 1,
      limits: {
        journals: 10,
        journalEntries: 200,
        storage: 200
      },
      metadata: {
        displayColor: '#2196F3',
        highlight: false,
        mostPopular: true
      }
    },
    {
      name: 'Premium',
      price: 9.99,
      billingCycle: 'monthly',
      features: ['Unlimited journals', 'Unlimited entries', 'AI-powered insights', 'Premium support'],
      description: 'For those who take journaling seriously',
      tier: 2,
      limits: {
        journals: -1,
        journalEntries: -1,
        storage: 1000
      },
      metadata: {
        displayColor: '#9C27B0',
        highlight: true,
        mostPopular: false
      }
    }
  ];
  
  // Insert plans if they don't exist
  const plans = [];
  for (const planData of defaultPlans) {
    let plan = await this.findOne({ name: planData.name });
    if (!plan) {
      plan = await this.create(planData);
    }
    plans.push(plan);
  }
  
  return plans;
};

/**
 * Subscription schema definition
 * Represents user subscriptions to plans
 */
const subscriptionSchema = new Schema({
  userId: { 
    type: Schema.Types.Mixed, // Allow either ObjectId or string
    required: true,
    index: true
  },
  planId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Plan',
    required: true
  },
  startDate: { 
    type: Date, 
    default: Date.now 
  },
  endDate: { 
    type: Date,
    required: true
  },
  status: { 
    type: String, 
    enum: ['active', 'expired', 'canceled', 'trial'], 
    default: 'active' 
  },
  paymentProvider: {
    type: String,
    enum: ['stripe', 'paypal', 'apple', 'manual', 'none'],
    default: 'none'
  },
  paymentDetails: {
    type: Schema.Types.Mixed,
    default: {}
  },
  autoRenew: {
    type: Boolean,
    default: true
  }
});

// Apply plugins
subscriptionSchema.plugin(timestampsPlugin);

// Instance methods
subscriptionSchema.methods.isActive = function() {
  return this.status === 'active' && new Date() < this.endDate;
};

subscriptionSchema.methods.cancel = function() {
  this.status = 'canceled';
  this.autoRenew = false;
  return this.save();
};

// Create models
export const Plan = mongoose.model('Plan', planSchema);
export const Subscription = mongoose.model('Subscription', subscriptionSchema);

export default {
  Plan,
  Subscription
};
