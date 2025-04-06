/**
 * User Module Resolvers - Simplified
 */

/**
 * Create GraphQL resolvers for the User module
 * 
 * @param {Object} ctx - Context object
 * @returns {Object} - GraphQL resolvers
 */
export const userResolvers = (ctx) => {
  console.log('[User Module] Creating simple GraphQL resolvers');
  
  // Return only the absolute essential resolvers
  return {
    Query: {
      // Health check resolver - always available
      userHealth: () => ({
        status: 'ok',
        message: 'User module is running',
        timestamp: new Date().toISOString()
      })
    }
  };
}; 