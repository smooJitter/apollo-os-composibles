/**
 * Helper functions for User module resolvers
 */

/**
 * Creates a safe resolver that catches errors and provides a consistent error format
 * @param {Function} resolver - The resolver function to wrap
 * @param {String} errorMessage - Default error message to show if error occurs
 * @returns {Function} - Wrapped resolver function
 */
export const createSafeResolver = (resolver, errorMessage = 'An error occurred') => 
  async (parent, args, context, info) => {
    try {
      return await resolver(parent, args, context, info);
    } catch (error) {
      console.error(`[Resolver Error] ${errorMessage}:`, error);
      throw new Error(errorMessage + (error.message ? `: ${error.message}` : ''));
    }
  };

export default {
  createSafeResolver
}; 