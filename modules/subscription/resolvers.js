import { getPlanTC, getSubscriptionTC, getPlanInputTC, getSubscriptionInputTC } from './registry.js';
import mongoose from 'mongoose';
import actions from './actions/index.js';

/**
 * Initialize the resolvers for the Subscription module
 * @returns {Object} Object containing GraphQL resolvers
 */
export const initResolvers = () => {
  // Initialize the type composers
  const PlanTC = getPlanTC();
  const SubscriptionTC = getSubscriptionTC();
  
  // Define queries
  const queries = {
    // Plan queries
    planById: PlanTC.mongooseResolvers.findById(),
    planOne: PlanTC.mongooseResolvers.findOne(),
    planMany: PlanTC.mongooseResolvers.findMany(),
    planCount: PlanTC.mongooseResolvers.count(),
    
    // Get all active plans
    activePlans: {
      type: [PlanTC],
      args: {
        sortBy: { type: 'String', defaultValue: 'tier' }
      },
      resolve: async (source, args, context) => {
        const { models, logger } = context;
        const { sortBy } = args;
        
        try {
          // Use static method to get active plans
          const plans = await models.Plan.getActivePlans();
          logger?.debug(`[Subscription] Retrieved ${plans.length} active plans`);
          return plans;
        } catch (error) {
          logger?.error(`[Subscription Resolver] Error fetching active plans: ${error.message}`);
          throw error;
        }
      }
    },
    
    // Subscription queries
    subscriptionById: SubscriptionTC.mongooseResolvers.findById(),
    subscriptionOne: SubscriptionTC.mongooseResolvers.findOne(),
    subscriptionMany: SubscriptionTC.mongooseResolvers.findMany(),
    subscriptionCount: SubscriptionTC.mongooseResolvers.count(),
    
    // Get user's active subscription
    userSubscription: {
      type: SubscriptionTC,
      args: {
        userId: 'MongoID!'
      },
      resolve: async (source, args, context) => {
        const { userId } = args;
        const { models, logger } = context;
        
        try {
          // Convert string ID to ObjectId
          const userObjectId = mongoose.Types.ObjectId.isValid(userId) 
            ? new mongoose.Types.ObjectId(userId)
            : null;
            
          if (!userObjectId) {
            throw new Error(`Invalid user ID: ${userId}`);
          }
          
          // Find active subscription for user
          const subscription = await models.Subscription.findOne({
            userId: userObjectId,
            status: 'active',
            endDate: { $gt: new Date() }
          }).sort({ endDate: -1 });
          
          if (subscription) {
            logger?.debug(`[Subscription] Found active subscription for user ${userId}`);
          } else {
            logger?.debug(`[Subscription] No active subscription found for user ${userId}`);
          }
          
          return subscription;
        } catch (error) {
          logger?.error(`[Subscription Resolver] Error fetching user subscription: ${error.message}`);
          throw error;
        }
      }
    },
    
    // Simple health check query
    subscriptionModuleHealth: {
      type: 'JSON',
      description: 'Check if the subscription module is healthy',
      resolve: () => ({
        status: 'healthy',
        message: 'Subscription module is working',
        timestamp: new Date().toISOString()
      })
    },
    
    subscriptionHealth: {
      type: 'JSON',
      description: 'Check the health of the subscription API service',
      resolve: async (_, args, ctx) => {
        try {
          const health = await actions.checkHealth(ctx);
          return {
            status: health.status,
            message: `Subscription API is ${health.status}`,
            timestamp: health.timestamp,
            details: {
              database: health.database,
              collections: health.collections,
              uptime: health.uptime
            }
          };
        } catch (error) {
          return {
            status: 'error',
            message: `Error checking subscription health: ${error.message}`,
            timestamp: new Date().toISOString(),
            details: null
          };
        }
      }
    },
    
    plans: async (_, args, ctx) => {
      return actions.getPlans(ctx);
    },
    
    planById: async (_, { id }, ctx) => {
      return actions.getPlan(ctx, id);
    },
    
    userSubscription: async (_, { userId }, ctx) => {
      return actions.getUserSubscription(ctx, userId);
    }
  };
  
  // Only add these resolvers if the type composers are available
  if (PlanTC) {
    queries.plans = {
      type: [PlanTC],
      resolve: async (_, args, ctx) => {
        try {
          if (ctx.models && ctx.models.Plan) {
            return await ctx.models.Plan.find();
          } else {
            console.warn('[Subscription Resolvers] Plan model not available');
            return [];
          }
        } catch (error) {
          console.error('[Subscription Resolvers] Error fetching plans:', error);
          return [];
        }
      }
    };
    
    queries.planById = {
      type: PlanTC,
      args: { id: 'MongoID!' },
      resolve: async (_, args, ctx) => {
        try {
          if (ctx.models && ctx.models.Plan) {
            const plan = await ctx.models.Plan.findById(args.id);
            if (!plan) throw new Error('Plan not found');
            return plan;
          } else {
            throw new Error('Plan model not available');
          }
        } catch (error) {
          console.error('[Subscription Resolvers] Error fetching plan by ID:', error);
          throw error;
        }
      }
    };
  }
  
  if (SubscriptionTC) {
    queries.userSubscription = {
      type: SubscriptionTC,
      args: { userId: 'MongoID!' },
      resolve: async (_, args, ctx) => {
        try {
          if (ctx.models && ctx.models.Subscription) {
            return await ctx.models.Subscription.findOne({ 
              userId: args.userId,
              status: 'active'
            });
          } else {
            throw new Error('Subscription model not available');
          }
        } catch (error) {
          console.error('[Subscription Resolvers] Error fetching user subscription:', error);
          throw error;
        }
      }
    };
  }
  
  // Define mutations
  const mutations = {
    // Plan mutations
    planCreate: {
      type: PlanTC,
      args: {
        input: getPlanInputTC()
      },
      resolve: async (source, args, context) => {
        const { input } = args;
        const { models, logger } = context;
        
        try {
          // Create new plan
          const plan = new models.Plan(input);
          await plan.save();
          
          logger?.debug(`[Subscription] Created plan "${plan.name}" with price ${plan.price}`);
          return plan;
        } catch (error) {
          logger?.error(`[Subscription Resolver] Error creating plan: ${error.message}`);
          throw error;
        }
      }
    },
    
    planUpdate: {
      type: PlanTC,
      args: {
        id: 'MongoID!',
        input: getPlanInputTC()
      },
      resolve: async (source, args, context) => {
        const { id, input } = args;
        const { models, logger } = context;
        
        try {
          // Find and update plan
          const plan = await models.Plan.findById(id);
          
          if (!plan) {
            throw new Error(`Plan not found: ${id}`);
          }
          
          // Update fields
          Object.keys(input).forEach(key => {
            plan[key] = input[key];
          });
          
          await plan.save();
          logger?.debug(`[Subscription] Updated plan "${plan.name}" (${id})`);
          
          return plan;
        } catch (error) {
          logger?.error(`[Subscription Resolver] Error updating plan: ${error.message}`);
          throw error;
        }
      }
    },
    
    // Subscription mutations
    createUserSubscription: {
      type: SubscriptionTC,
      args: {
        userId: 'MongoID!',
        planId: 'MongoID!',
        input: getSubscriptionInputTC()
      },
      resolve: async (source, args, context) => {
        const { userId, planId, input } = args;
        const { models, logger } = context;
        
        try {
          // Validate user and plan
          const userObjectId = mongoose.Types.ObjectId.isValid(userId) 
            ? new mongoose.Types.ObjectId(userId)
            : null;
            
          const planObjectId = mongoose.Types.ObjectId.isValid(planId) 
            ? new mongoose.Types.ObjectId(planId)
            : null;
            
          if (!userObjectId) {
            throw new Error(`Invalid user ID: ${userId}`);
          }
          
          if (!planObjectId) {
            throw new Error(`Invalid plan ID: ${planId}`);
          }
          
          // Check if plan exists
          const plan = await models.Plan.findById(planObjectId);
          if (!plan) {
            throw new Error(`Plan not found: ${planId}`);
          }
          
          // Check if user has active subscription and deactivate it
          await models.Subscription.updateMany(
            { 
              userId: userObjectId, 
              status: 'active'
            },
            { 
              $set: { 
                status: 'expired',
                autoRenew: false
              } 
            }
          );
          
          // Calculate end date if not provided
          let endDate = input.endDate;
          if (!endDate) {
            const startDate = input.startDate || new Date();
            endDate = new Date(startDate);
            
            // Set end date based on billing cycle
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
                endDate.setFullYear(endDate.getFullYear() + 100); // Effectively forever
                break;
              default:
                endDate.setMonth(endDate.getMonth() + 1); // Default to monthly
            }
          }
          
          // Create new subscription
          const subscription = new models.Subscription({
            userId: userObjectId,
            planId: planObjectId,
            startDate: input.startDate || new Date(),
            endDate,
            status: input.status || 'active',
            paymentProvider: input.paymentProvider || 'manual',
            paymentDetails: input.paymentDetails || {},
            autoRenew: input.autoRenew !== undefined ? input.autoRenew : true
          });
          
          await subscription.save();
          logger?.debug(`[Subscription] Created subscription for user ${userId} to plan "${plan.name}"`);
          
          return subscription;
        } catch (error) {
          logger?.error(`[Subscription Resolver] Error creating subscription: ${error.message}`);
          throw error;
        }
      }
    },
    
    cancelSubscription: {
      type: SubscriptionTC,
      args: {
        id: 'MongoID!'
      },
      resolve: async (source, args, context) => {
        const { id } = args;
        const { models, logger, currentUser } = context;
        
        try {
          // Find subscription
          const subscription = await models.Subscription.findById(id);
          
          if (!subscription) {
            throw new Error(`Subscription not found: ${id}`);
          }
          
          // Check ownership if currentUser is available
          if (currentUser && subscription.userId.toString() !== currentUser.id.toString()) {
            throw new Error('Not authorized to cancel this subscription');
          }
          
          // Cancel subscription
          subscription.status = 'canceled';
          subscription.autoRenew = false;
          await subscription.save();
          
          logger?.debug(`[Subscription] Canceled subscription ${id}`);
          return subscription;
        } catch (error) {
          logger?.error(`[Subscription Resolver] Error canceling subscription: ${error.message}`);
          throw error;
        }
      }
    },
    
    // Initialize default plans if needed
    initializeDefaultPlans: {
      type: [PlanTC],
      resolve: async (source, args, context) => {
        const { models, logger } = context;
        
        try {
          // Use static method to initialize default plans
          const plans = await models.Plan.initializeDefaultPlans();
          logger?.debug(`[Subscription] Initialized ${plans.length} default plans`);
          
          return plans;
        } catch (error) {
          logger?.error(`[Subscription Resolver] Error initializing default plans: ${error.message}`);
          throw error;
        }
      }
    },
    
    createSubscription: async (_, { userId, planId }, ctx) => {
      return actions.createSubscription(ctx, { userId, planId });
    }
  };
  
  // Only add these mutations if the type composers are available
  if (PlanTC) {
    mutations.createPlan = {
      type: PlanTC,
      args: {
        name: 'String!',
        price: 'Float!',
        billingCycle: 'String!',
        features: '[String]',
        description: 'String',
        isActive: 'Boolean'
      },
      resolve: async (_, args, ctx) => {
        try {
          if (ctx.models && ctx.models.Plan) {
            const plan = new ctx.models.Plan(args);
            await plan.save();
            return plan;
          } else {
            throw new Error('Plan model not available');
          }
        } catch (error) {
          console.error('[Subscription Resolvers] Error creating plan:', error);
          throw error;
        }
      }
    };
  }
  
  if (SubscriptionTC) {
    mutations.createSubscription = {
      type: SubscriptionTC,
      args: {
        userId: 'MongoID!',
        planId: 'MongoID!',
        startDate: 'Date',
        endDate: 'Date!',
        status: 'String',
        paymentProvider: 'String',
        autoRenew: 'Boolean'
      },
      resolve: async (_, args, ctx) => {
        try {
          if (ctx.models && ctx.models.Subscription) {
            // Create the subscription
            const subscription = new ctx.models.Subscription(args);
            await subscription.save();
            return subscription;
          } else {
            throw new Error('Subscription model not available');
          }
        } catch (error) {
          console.error('[Subscription Resolvers] Error creating subscription:', error);
          throw error;
        }
      }
    };
  }
  
  // Return an object structure that will be directly compatible with the ModuleComposer
  return {
    Query: queries,
    Mutation: mutations
  };
};

export default {
  initResolvers
};
