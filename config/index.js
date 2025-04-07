// Main config file that re-exports all configuration modules
import * as env from './environment.js';

// Basic configuration object
const config = {
  environment: env.NODE_ENV || 'development',
  isProduction: env.isProduction,
  isDevelopment: !env.isProduction,
  
  // API endpoints
  endpoints: {
    subscriptionApi: process.env.SUBSCRIPTION_API_URL || 'http://localhost:4005/api',
  },
  
  // Application settings
  app: {
    name: 'ApolloOS',
    version: '1.0.0',
  }
};

export default config; 