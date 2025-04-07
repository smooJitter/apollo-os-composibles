/**
 * Subscription API Client
 * Provides methods to interact with the dedicated subscription API
 */
import axios from 'axios';

// Try to load config, but don't fail if it's not available
let config;
try {
  config = await import('../../config/index.js').then(m => m.default);
} catch (err) {
  console.warn('Could not load config file, using default API URL');
}

// Default API URL, can be overridden with SUBSCRIPTION_API_URL env var
const API_URL = process.env.SUBSCRIPTION_API_URL || 
                (config?.endpoints?.subscriptionApi) || 
                'http://localhost:4005/api';

/**
 * Client for interacting with the subscription API
 */
export class SubscriptionApiClient {
  constructor(baseUrl = API_URL) {
    this.baseUrl = baseUrl;
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000, // 10 seconds timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Get all available plans
   * @returns {Promise<Array>} List of plans
   */
  async getPlans() {
    try {
      const response = await this.client.get('/plans');
      return response.data;
    } catch (error) {
      console.error('Error fetching plans:', error.message);
      throw error;
    }
  }

  /**
   * Get a specific plan by ID
   * @param {string} planId - The plan ID
   * @returns {Promise<Object>} Plan details
   */
  async getPlan(planId) {
    try {
      const response = await this.client.get(`/plans/${planId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching plan ${planId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get a user's active subscription
   * @param {string} userId - The user ID
   * @returns {Promise<Object|null>} Subscription details or null if not found
   */
  async getUserSubscription(userId) {
    try {
      const response = await this.client.get(`/subscriptions/user/${userId}`);
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return null;
      }
      console.error(`Error fetching subscription for user ${userId}:`, error.message);
      throw error;
    }
  }

  /**
   * Create a new subscription
   * @param {string} userId - The user ID
   * @param {string} planId - The plan ID
   * @returns {Promise<Object>} Created subscription
   */
  async createSubscription(userId, planId) {
    try {
      const response = await this.client.post('/subscriptions', { userId, planId });
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message;
      console.error('Error creating subscription:', errorMessage);
      throw new Error(`Failed to create subscription: ${errorMessage}`);
    }
  }

  /**
   * Check the health of the subscription API server
   * @param {boolean} [detailed=false] - Whether to return detailed health information
   * @returns {Promise<Object>} Health status information
   */
  async checkHealth(detailed = false) {
    try {
      // Use base API URL without the /api path
      const baseUrl = this.baseUrl.replace(/\/api$/, '');
      const response = await axios.get(`${baseUrl}/health`);
      const data = response.data;
      
      if (!detailed) {
        // Return a simplified health summary
        return {
          status: data.status,
          database: data.database?.status || 'unknown',
          collections: {
            plans: data.database?.collections?.plans || 0,
            subscriptions: data.database?.collections?.subscriptions || 0
          },
          uptime: data.system?.uptime || 0,
          timestamp: data.timestamp
        };
      }
      
      return data;
    } catch (error) {
      console.error('Health check failed:', error.message);
      return {
        status: 'unreachable',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }
}

// Create and export a default instance
const subscriptionClient = new SubscriptionApiClient();
export default subscriptionClient; 