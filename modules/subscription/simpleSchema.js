/**
 * Simple subscription schema for Apollo integration
 * 
 * This file provides a simplified schema for the subscription module
 * that can be directly integrated with Apollo Server without depending
 * on models or other components that might cause circular dependencies.
 */
import { gql } from 'graphql-tag';
import subscriptionClient from './api-client.js';

// Define a simple GraphQL schema
export const typeDefs = gql`
  type SubscriptionPlan {
    id: ID!
    name: String!
    price: Float!
    billingCycle: String!
    description: String
    features: [String!]
  }
  
  type HealthStatus {
    status: String!
    message: String
    timestamp: String!
    details: JSON
  }
  
  extend type Query {
    subscriptionHealth: HealthStatus!
    getPlans: [SubscriptionPlan!]!
  }
`;

// Define resolvers that use the API client
export const resolvers = {
  Query: {
    subscriptionHealth: async (_, __, context) => {
      try {
        const health = await subscriptionClient.checkHealth();
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
        console.error('[Simple Schema] Health check error:', error);
        return {
          status: 'error',
          message: `Error checking subscription health: ${error.message}`,
          timestamp: new Date().toISOString(),
          details: null
        };
      }
    },
    
    getPlans: async (_, __, context) => {
      try {
        const plans = await subscriptionClient.getPlans();
        // Transform the plans to match the schema
        return plans.map(plan => ({
          id: plan._id,
          name: plan.name,
          price: plan.price,
          billingCycle: plan.billingCycle,
          description: plan.description,
          features: plan.features || []
        }));
      } catch (error) {
        console.error('[Simple Schema] Get plans error:', error);
        return [];
      }
    }
  }
};

export default {
  typeDefs,
  resolvers
}; 