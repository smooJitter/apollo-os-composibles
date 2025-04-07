/**
 * Subscription module actions
 * 
 * This file contains action handlers for subscription-related functionality
 */
import subscriptionClient from '../api-client.js';

// Export default actions object with all named exports
const actions = {
  getPlans,
  getPlan,
  getUserSubscription,
  createSubscription,
  checkHealth,
};

export default actions;

/**
 * Get all available subscription plans
 * @param {Object} ctx - Application context
 * @returns {Promise<Array>} - List of available plans
 */
export async function getPlans(ctx) {
  try {
    const plans = await subscriptionClient.getPlans();
    ctx.logger?.debug(`[Subscription Actions] Retrieved ${plans.length} plans`);
    return plans;
  } catch (error) {
    ctx.logger?.error(`[Subscription Actions] Error fetching plans: ${error.message}`);
    throw error;
  }
}

/**
 * Get a specific plan by ID
 * @param {Object} ctx - Application context
 * @param {String} planId - The plan ID to fetch
 * @returns {Promise<Object>} - The plan details
 */
export async function getPlan(ctx, planId) {
  if (!planId) {
    throw new Error('Plan ID is required');
  }

  try {
    const plan = await subscriptionClient.getPlan(planId);
    ctx.logger?.debug(`[Subscription Actions] Retrieved plan: ${plan.name}`);
    return plan;
  } catch (error) {
    ctx.logger?.error(`[Subscription Actions] Error fetching plan ${planId}: ${error.message}`);
    throw error;
  }
}

/**
 * Get a user's active subscription
 * @param {Object} ctx - Application context
 * @param {String} userId - The user ID
 * @returns {Promise<Object|null>} - The user's active subscription or null if none
 */
export async function getUserSubscription(ctx, userId) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    const subscription = await subscriptionClient.getUserSubscription(userId);
    ctx.logger?.debug(`[Subscription Actions] Retrieved subscription for user ${userId}: ${subscription ? 'Found' : 'None'}`);
    return subscription;
  } catch (error) {
    ctx.logger?.error(`[Subscription Actions] Error fetching subscription for user ${userId}: ${error.message}`);
    throw error;
  }
}

/**
 * Create a new subscription for a user
 * @param {Object} ctx - Application context
 * @param {Object} params - Parameters for the action
 * @param {String} params.userId - User ID
 * @param {String} params.planId - Plan ID
 * @returns {Promise<Object>} - The created subscription
 */
export async function createSubscription(ctx, { userId, planId }) {
  const { logger } = ctx;
  
  if (!userId || !planId) {
    throw new Error('Both userId and planId are required');
  }
  
  try {
    const subscription = await subscriptionClient.createSubscription(userId, planId);
    logger?.debug(`[Subscription Actions] Created subscription for user ${userId} to plan ${planId}`);
    return subscription;
  } catch (error) {
    logger?.error(`[Subscription Actions] Error creating subscription: ${error.message}`);
    throw error;
  }
}

/**
 * Check the health of the subscription API
 * @param {Object} ctx - Application context
 * @returns {Promise<Object>} - Health status information
 */
export async function checkHealth(ctx) {
  try {
    const health = await subscriptionClient.checkHealth();
    ctx.logger?.debug(`[Subscription Actions] Health check: ${health.status}`);
    return health;
  } catch (error) {
    ctx.logger?.error(`[Subscription Actions] Health check failed: ${error.message}`);
    throw error;
  }
}
