import mongoose from 'mongoose';
const { Schema } = mongoose;

/**
 * UserProfile schema definition
 */
const userProfileSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  bio: {
    type: String,
    default: '',
    trim: true,
  },
  avatarUrl: {
    type: String,
    default: '',
    trim: true,
  },
  socialLinks: {
    type: Map,
    of: String,
    default: {},
  },
  preferences: {
    type: Map,
    of: Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      // Convert Maps to objects for JSON
      if (ret.socialLinks) {
        ret.socialLinks = Array.from(ret.socialLinks.entries()).map(([platform, url]) => ({
          platform,
          url,
        }));
      }
      if (ret.preferences) {
        ret.preferences = Object.fromEntries(ret.preferences);
      }
      return ret;
    }
  }
});

// Create and export the UserProfile model creator
export const userProfileSchemas = {
  UserProfile: () => {
    // Register the model if it doesn't exist
    if (mongoose.models.UserProfile) {
      return mongoose.models.UserProfile;
    }
    return mongoose.model('UserProfile', userProfileSchema);
  }
}; 