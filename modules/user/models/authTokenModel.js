import mongoose from 'mongoose';

export default function createAuthTokenModel(ctx) {
  const { timestamps } = ctx.sharedMongoose.plugins; // Get shared timestamp plugin

  const AuthTokenSchema = new mongoose.Schema({
    token: {
      type: String,
      required: true,
      index: true, // Index for faster lookup
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      // Optional: TTL index to automatically remove expired tokens from MongoDB
      // index: { expires: '1m' } // Example: expire after 1 minute
    },
    // You could add more fields like 'userAgent', 'ipAddress' for security
  });

  // --- Plugins ---
  AuthTokenSchema.plugin(timestamps);

  // --- Methods/Statics/Hooks ---
  // Add as needed, e.g., a static method to find and verify a token

  return mongoose.models.AuthToken || mongoose.model('AuthToken', AuthTokenSchema);
}
