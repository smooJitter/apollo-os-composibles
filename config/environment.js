import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Determine if we're in production mode
export const isProduction = process.env.NODE_ENV === 'production';

// Centralized configuration object
export const config = {
  // Server configuration
  server: {
    port: process.env.PORT || 4000,
    host: process.env.HOST || 'localhost',
    useAlternativePort: process.env.USE_ALTERNATIVE_PORT === 'true' || false,
  },

  // Database configuration
  db: {
    uri: (process.env.MONGODB_URI || 'mongodb://localhost:27017/apolloos_dev').replace(
      'localhost',
      '127.0.0.1'
    ), // Use 127.0.0.1 instead of localhost
    useMock: process.env.USE_MOCK_DB === 'true' || false,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      family: 4, // Use IPv4, skip trying IPv6
    },
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'development-unsafe-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
    format: isProduction ? 'json' : 'pretty',
  },

  // GraphQL configuration
  graphql: {
    path: '/graphql',
    introspection: process.env.ENABLE_INTROSPECTION === 'true' || !isProduction,
  },
};

// Export default config
export default config;
