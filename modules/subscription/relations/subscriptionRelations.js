import { schemaComposer } from 'graphql-compose';
import { getPlanTC, getSubscriptionTC } from '../registry.js';

/**
 * Subscription module relations
 * @param {Object} ctx - Application context
 */
export default function subscriptionRelations(ctx) {
  const { logger, models, typeComposers } = ctx;
  
  try {
    // Initialize type composers if not already done
    const PlanTC = getPlanTC();
    const SubscriptionTC = getSubscriptionTC();
    
    if (!PlanTC || !SubscriptionTC) {
      logger?.warn('[Subscription Relations] Required type composers not found');
      return;
    }
    
    // Method 1: Try to get UserTC from context typeComposers
    let UserTC;
    if (typeComposers && typeComposers.UserTC) {
      UserTC = typeComposers.UserTC;
      logger?.debug('[Subscription Relations] Found User type in context typeComposers');
    } 
    // Method 2: Try to get from modules
    else if (ctx.app && ctx.app.modules) {
      const userModule = ctx.app.modules.find(m => m.id === 'user');
      if (userModule && userModule.typeComposers && userModule.typeComposers.UserTC) {
        UserTC = userModule.typeComposers.UserTC;
        logger?.debug('[Subscription Relations] Found User type in user module');
      }
    }
    // Method 3: Try schemaComposer as last resort
    if (!UserTC) {
      try {
        UserTC = schemaComposer.getOTC('User');
        logger?.debug('[Subscription Relations] Found User type in schemaComposer');
      } catch (e) {
        logger?.warn(`[Subscription Relations] Could not find User type: ${e.message}`);
      }
    }
    
    logger?.debug(`[Subscription Relations] Found types: Plan (${!!PlanTC}), Subscription (${!!SubscriptionTC}), User (${!!UserTC})`);
    
    // Add relations between Subscription and Plan
    SubscriptionTC.addFields({
      plan: {
        type: PlanTC,
        description: 'The plan associated with this subscription',
        resolve: async (subscription, args, context) => {
          try {
            if (!subscription || !subscription.planId) return null;
            
            // Use models from context if available, otherwise from function argument
            const modelContext = context.models || models;
            return await modelContext.Plan.findById(subscription.planId);
          } catch (error) {
            logger?.error(`[Error] Resolving subscription plan relation: ${error.message}`);
            return null;
          }
        }
      },
      isActive: {
        type: 'Boolean',
        description: 'Whether the subscription is currently active',
        resolve: (subscription) => {
          return subscription.status === 'active' && new Date() < new Date(subscription.endDate);
        }
      },
      remainingDays: {
        type: 'Int',
        description: 'Number of days remaining in the subscription',
        resolve: (subscription) => {
          if (subscription.status !== 'active') return 0;
          
          const now = new Date();
          const endDate = new Date(subscription.endDate);
          if (now > endDate) return 0;
          
          const diffTime = Math.abs(endDate - now);
          return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
      }
    });
    
    // If User type is available, add relations
    if (UserTC) {
      // Add subscriptions field to User type
      UserTC.addFields({
        subscriptions: {
          type: [SubscriptionTC],
          description: 'All subscriptions for this user',
          resolve: async (user, args, context) => {
            try {
              if (!user || !user._id) return [];
              
              // Use models from context if available, otherwise from function argument
              const modelContext = context.models || models;
              
              return await modelContext.Subscription.find({ 
                userId: user._id 
              }).sort({ startDate: -1 });
            } catch (error) {
              logger?.error(`[Error] Resolving user subscriptions relation: ${error.message}`);
              return [];
            }
          }
        },
        activeSubscription: {
          type: SubscriptionTC,
          description: 'The active subscription for this user',
          resolve: async (user, args, context) => {
            try {
              if (!user || !user._id) return null;
              
              // Use models from context if available, otherwise from function argument
              const modelContext = context.models || models;
              
              const now = new Date();
              const subscription = await modelContext.Subscription.findOne({
                userId: user._id,
                status: 'active',
                endDate: { $gt: now }
              }).sort({ endDate: -1 });
              
              return subscription;
            } catch (error) {
              logger?.error(`[Error] Resolving user active subscription relation: ${error.message}`);
              return null;
            }
          }
        },
        currentPlan: {
          type: PlanTC,
          description: 'The current plan for this user',
          resolve: async (user, args, context) => {
            try {
              if (!user || !user._id) return null;
              
              // Use models from context if available, otherwise from function argument
              const modelContext = context.models || models;
              
              const now = new Date();
              const subscription = await modelContext.Subscription.findOne({
                userId: user._id,
                status: 'active',
                endDate: { $gt: now }
              }).sort({ endDate: -1 });
              
              if (!subscription) {
                // If no active subscription, try to find free plan
                return await modelContext.Plan.findOne({ name: 'Free' });
              }
              
              return await modelContext.Plan.findById(subscription.planId);
            } catch (error) {
              logger?.error(`[Error] Resolving user current plan relation: ${error.message}`);
              return null;
            }
          }
        },
        subscriptionStatus: {
          type: 'String',
          description: 'Status of the current subscription',
          resolve: async (user, args, context) => {
            try {
              if (!user || !user._id) return 'none';
              
              // Use models from context if available, otherwise from function argument
              const modelContext = context.models || models;
              
              const now = new Date();
              const subscription = await modelContext.Subscription.findOne({
                userId: user._id,
                status: 'active',
                endDate: { $gt: now }
              });
              
              return subscription ? subscription.status : 'none';
            } catch (error) {
              logger?.error(`[Error] Resolving user subscription status: ${error.message}`);
              return 'error';
            }
          }
        }
      });
      
      // Add user field to Subscription type
      SubscriptionTC.addFields({
        user: {
          type: UserTC,
          description: 'The user who owns this subscription',
          resolve: async (subscription, args, context) => {
            try {
              if (!subscription || !subscription.userId) return null;
              
              // Use models from context if available, otherwise from function argument
              const modelContext = context.models || models;
              return await modelContext.User.findById(subscription.userId);
            } catch (error) {
              logger?.error(`[Error] Resolving subscription user relation: ${error.message}`);
              return null;
            }
          }
        }
      });
      
      logger?.debug('[Subscription Relations] Added User <-> Subscription <-> Plan relations');
    } else {
      logger?.debug('[Subscription Relations] User type not found, skipping User relations');
    }
    
    logger?.debug('[Subscription Relations] Successfully applied relations');
  } catch (error) {
    logger?.error(`[Subscription Relations] Error applying relations: ${error.message}`);
  }
  
  return ctx;
}
