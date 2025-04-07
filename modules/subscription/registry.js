import { schemaComposer } from 'graphql-compose';
import { composeMongoose } from 'graphql-compose-mongoose';
import { Plan, Subscription } from './schemas.js';

// Create and register type composers
const typeComposers = {};

/**
 * Initialize type composers for the Subscription module
 * @returns {Object} Object containing initialized type composers
 */
export const initTypeComposers = () => {
  if (Object.keys(typeComposers).length > 0) {
    return typeComposers;
  }

  try {
    // Create type composers for Plan and Subscription
    const PlanTC = composeMongoose(Plan, { removeFields: ['__v'] });
    const SubscriptionTC = composeMongoose(Subscription, { removeFields: ['__v'] });
    
    // Create Subscription Status Enum
    if (!schemaComposer.has('SubscriptionStatus')) {
      schemaComposer.createEnumTC({
        name: 'SubscriptionStatus',
        values: {
          ACTIVE: { value: 'active' },
          EXPIRED: { value: 'expired' },
          CANCELED: { value: 'canceled' },
          TRIAL: { value: 'trial' }
        }
      });
    }

    // Create Billing Cycle Enum
    if (!schemaComposer.has('BillingCycle')) {
      schemaComposer.createEnumTC({
        name: 'BillingCycle',
        values: {
          MONTHLY: { value: 'monthly' },
          QUARTERLY: { value: 'quarterly' },
          ANNUAL: { value: 'annual' },
          LIFETIME: { value: 'lifetime' }
        }
      });
    }
    
    // Create input types
    const PlanInputTC = schemaComposer.createInputTC({
      name: 'PlanInput',
      fields: {
        name: 'String!',
        price: 'Float!',
        billingCycle: 'BillingCycle',
        features: '[String]',
        description: 'String',
        isActive: 'Boolean',
        tier: 'Int',
        limits: 'JSON',
        metadata: 'JSON'
      }
    });
    
    const SubscriptionInputTC = schemaComposer.createInputTC({
      name: 'SubscriptionInput',
      fields: {
        planId: 'MongoID!',
        startDate: 'Date',
        endDate: 'Date!',
        status: 'SubscriptionStatus',
        paymentProvider: 'String',
        paymentDetails: 'JSON',
        autoRenew: 'Boolean'
      }
    });
    
    // Register all composers
    typeComposers.PlanTC = PlanTC;
    typeComposers.SubscriptionTC = SubscriptionTC;
    typeComposers.PlanInputTC = PlanInputTC;
    typeComposers.SubscriptionInputTC = SubscriptionInputTC;
    
    return typeComposers;
  } catch (error) {
    console.error('[Subscription Registry] Error initializing type composers:', error);
    throw error;
  }
};

// Getters for type composers
export const getPlanTC = () => {
  if (!typeComposers.PlanTC) {
    initTypeComposers();
  }
  return typeComposers.PlanTC;
};

export const getSubscriptionTC = () => {
  if (!typeComposers.SubscriptionTC) {
    initTypeComposers();
  }
  return typeComposers.SubscriptionTC;
};

export const getPlanInputTC = () => {
  if (!typeComposers.PlanInputTC) {
    initTypeComposers();
  }
  return typeComposers.PlanInputTC;
};

export const getSubscriptionInputTC = () => {
  if (!typeComposers.SubscriptionInputTC) {
    initTypeComposers();
  }
  return typeComposers.SubscriptionInputTC;
};

export default {
  initTypeComposers,
  getPlanTC,
  getSubscriptionTC,
  getPlanInputTC,
  getSubscriptionInputTC
};
