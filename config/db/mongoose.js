import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { createMockMongoose } from './mockMongoose.js';

// Load environment variables
dotenv.config();

/**
 * Sets up and manages MongoDB connection
 *
 * @param {Object} ctx - Application context
 * @param {Object} options - Connection options
 * @returns {Promise<mongoose>} - Mongoose instance
 */
export async function setupMongoose(ctx, config = {}) {
  const { logger } = ctx;
  // Use 127.0.0.1 instead of localhost to avoid IPv6 issues
  const MONGODB_URI = (process.env.MONGODB_URI || 'mongodb://localhost:27017/apolloos_dev').replace(
    'localhost',
    '127.0.0.1'
  );
  const USE_MOCK_DB = process.env.USE_MOCK_DB === 'true' || false;

  // Skip actual connection for mock mode
  if (USE_MOCK_DB) {
    logger.warn('[DB] Using MOCK DATABASE MODE - no actual database connection');
    logger.warn('[DB] This mode is for development only and has limited functionality');

    // Create and use mock mongoose implementation
    const mockMongoose = createMockMongoose(ctx);
    
    // Replace the global mongoose with our mock implementation
    global.mongoose = mockMongoose;
    ctx.mongoose = mockMongoose;
    
    logger.debug('[DB] Mongoose has been replaced with MockMongoose in global scope');
    
    await mockMongoose.connect(); // Simulates a connection
    
    return mockMongoose;
  }

  // Connection options
  const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000, // Lower timeout for faster feedback
    family: 4, // Force IPv4 instead of trying IPv6 first
    ...config,
  };

  try {
    logger.info(`[DB] Connecting to MongoDB: ${MONGODB_URI}`);
    await mongoose.connect(MONGODB_URI, options);

    const db = mongoose.connection;

    db.on('error', (err) => {
      logger.error('[DB] MongoDB Connection Error:', err);
      logger.error('[DB] MongoDB Connection Error Details:', err.stack);
    });

    db.on('disconnected', () => {
      logger.info('[DB] Disconnected from MongoDB');
    });

    db.on('connected', () => {
      logger.info('[DB] Connected to MongoDB');
    });

    db.on('reconnected', () => {
      logger.info('[DB] Reconnected to MongoDB');
    });

    // Handle process termination
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        logger.info('[DB] MongoDB connection closed due to app termination');
        process.exit(0);
      } catch (err) {
        logger.error('[DB] Error closing MongoDB connection:', err);
        process.exit(1);
      }
    });

    ctx.mongoose = mongoose;
    logger.info(`[DB] Successfully connected to MongoDB: ${MONGODB_URI}`);
    return mongoose;
  } catch (err) {
    logger.error('[DB] Failed to initialize MongoDB connection:', err);
    logger.info(`[DB] To start MongoDB locally, run 'mongod'`);
    logger.info(
      `[DB] Or set USE_MOCK_DB=true in environment to use mock database for development.`
    );
    throw err;
  }
}

export default setupMongoose;
