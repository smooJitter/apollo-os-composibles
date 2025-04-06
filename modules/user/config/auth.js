/**
 * User Module Authentication Configuration
 * 
 * Defines authentication settings and options for the user module.
 */

// JWT token configuration
export const jwt = {
  // Default expiration time (in seconds)
  expiresIn: 60 * 60 * 24, // 24 hours
  
  // Token refresh settings
  refreshable: true,
  refreshExpiresIn: 60 * 60 * 24 * 7, // 7 days
  
  // JWT algorithm and options
  algorithm: 'HS256',
  
  // Use the environment variable for the secret
  secretEnvKey: 'JWT_SECRET',
  
  // Claims to include in the token
  claims: {
    issuer: 'apollo-os',
    audience: 'client'
  }
};

// Session configuration (if using session-based auth)
export const session = {
  enabled: false,
  cookieName: 'apollo_session',
  maxAge: 60 * 60 * 24 * 14, // 14 days
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax'
};

// Login configuration
export const login = {
  // Maximum login attempts before temporary lockout
  maxAttempts: 5,
  
  // Lockout duration in seconds
  lockoutDuration: 15 * 60, // 15 minutes
  
  // Whether to track login history
  trackHistory: true,
  
  // Whether to allow concurrent sessions
  allowConcurrentSessions: true,
  
  // Maximum concurrent sessions
  maxConcurrentSessions: 5
};

// OAuth providers configuration (if applicable)
export const oauth = {
  enabled: false,
  providers: {
    google: {
      enabled: false,
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackUrl: '/auth/google/callback'
    },
    github: {
      enabled: false,
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackUrl: '/auth/github/callback'
    }
    // Add other providers as needed
  }
};

// Account recovery configuration
export const recovery = {
  // Password reset token lifetime in seconds
  resetTokenExpiresIn: 60 * 60, // 1 hour
  
  // Whether to allow password resets
  allowPasswordReset: true,
  
  // Whether to verify reset requests via email
  verifyViaEmail: true
};

export default {
  jwt,
  session,
  login,
  oauth,
  recovery
}; 