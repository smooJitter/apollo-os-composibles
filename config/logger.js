import winston from 'winston';
import path from 'path';

/**
 * Creates a configured Winston logger instance with formatting
 * based on the current environment.
 * 
 * @param {Object} config - Optional configuration overrides
 * @returns {Object} A configured Winston logger
 */
export function createLogger(config = {}) {
  const isDev = process.env.NODE_ENV !== 'production';
  
  // Define custom log levels that match the ApolloOS naming
  const logLevels = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
  };

  // Define color scheme
  const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    debug: 'blue',
  };

  // Add colors to winston
  winston.addColors(colors);

  // Format for development - colorful and readable
  const devFormat = winston.format.combine(
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.colorize({ all: true }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
      return `[${timestamp}] ${level}: ${message} ${metaStr}`;
    })
  );

  // Format for production - JSON for log aggregation
  const prodFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  );

  // Default transports
  const transports = [
    new winston.transports.Console({
      level: isDev ? 'debug' : 'info', // Show more logs in dev mode
    }),
  ];

  // Add file transport in production
  if (!isDev) {
    transports.push(
      new winston.transports.File({
        filename: path.join(process.cwd(), 'logs', 'error.log'),
        level: 'error',
      }),
      new winston.transports.File({
        filename: path.join(process.cwd(), 'logs', 'combined.log'),
      })
    );
  }

  // Create the logger instance
  const logger = winston.createLogger({
    levels: logLevels,
    format: isDev ? devFormat : prodFormat,
    transports,
    ...config,
  });

  // Add convenience method for module-specific logging
  logger.getModuleLogger = (moduleName) => {
    // Create a wrapper that prepends the module name to messages
    const moduleLogger = {};
    
    Object.keys(logLevels).forEach((level) => {
      moduleLogger[level] = (message, ...args) => {
        return logger[level](`[${moduleName}] ${message}`, ...args);
      };
    });
    
    return moduleLogger;
  };

  return logger;
}

// Export a singleton logger instance for convenience
export default createLogger(); 