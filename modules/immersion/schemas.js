import mongoose from 'mongoose';
import { timestampsPlugin } from '../../config/shared-mongoose/plugins/timestamps.js';
import { taggableFlexWeightedPlugin } from '../../config/shared-mongoose/plugins/taggableFlexWeighted.js';
import { TYPE_ENUMS, AI_MODULE_ENUMS, TARGET_AUDIENCES, LIFE_AREAS } from './constants.js';

const { Schema } = mongoose;

/**
 * Engagement Metrics Schema
 * Tracks user engagement with immersive experiences
 */
const engagementMetricsSchema = new Schema({
  completionRate: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  averageSessionTime: {
    type: Number, // in seconds
    default: 0
  },
  userRatings: {
    count: {
      type: Number,
      default: 0
    },
    average: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    }
  },
  revisitRate: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  shareCount: {
    type: Number,
    default: 0
  },
  effectivenessScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  completedCount: {
    type: Number,
    default: 0
  },
  startedCount: {
    type: Number,
    default: 0
  }
}, { _id: false });

/**
 * Metadata Schema
 * Additional metadata for immersions
 */
const metadataSchema = new Schema({
  color: {
    type: String,
    default: '#4a6da7' // Default blue for immersions
  },
  icon: {
    type: String,
    default: 'visibility'
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  recommendedDuration: {
    type: String
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Moderate', 'Challenging'],
    default: 'Moderate'
  },
  lifeAreas: [{
    type: String,
    enum: LIFE_AREAS
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  requiredResources: {
    type: String
  },
  relatedManifestationTypes: [{
    type: String
  }]
}, { _id: false });

/**
 * Tags Schema
 * Tags for categorizing and finding immersions
 */
const tagsSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['Theme', 'Technique', 'Goal', 'Custom'],
    default: 'Custom'
  }
}, { _id: true });

/**
 * Media Item Schema
 * Media associated with the immersion
 */
const mediaItemSchema = new Schema({
  type: {
    type: String,
    enum: ['image', 'audio', 'video', 'document'],
    required: true
  },
  url: {
    type: String,
    required: true
  },
  title: {
    type: String
  },
  description: {
    type: String
  },
  duration: {
    type: Number // Duration in seconds for audio/video
  },
  isGeneratedByAI: {
    type: Boolean,
    default: false
  },
  aiPromptUsed: {
    type: String
  }
}, { _id: true });

/**
 * User Progress Schema
 * Tracks individual user's progress with an immersion
 */
const userProgressSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  sessionDurations: [{
    startedAt: Date,
    endedAt: Date,
    duration: Number // in seconds
  }],
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  feedback: {
    type: String
  },
  effectiveness: {
    type: Number,
    min: 1,
    max: 10
  },
  notes: {
    type: String
  }
}, { timestamps: true });

/**
 * Immersion Schema
 * Main schema for immersive experiences
 */
const immersionSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: { 
    type: String, 
    required: true 
  },
  description: {
    type: String
  },
  type: {
    type: String,
    enum: TYPE_ENUMS,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  structuredContent: {
    type: Schema.Types.Mixed,
    default: null
  },
  aiModuleUsed: {
    type: String,
    enum: AI_MODULE_ENUMS
  },
  aiPromptUsed: {
    type: String
  },
  isGeneratedByAI: {
    type: Boolean,
    default: false
  },
  targetAudience: {
    type: String,
    enum: TARGET_AUDIENCES
  },
  engagementMetrics: {
    type: engagementMetricsSchema,
    default: () => ({})
  },
  metadata: {
    type: metadataSchema,
    default: () => ({})
  },
  tags: [tagsSchema],
  media: [mediaItemSchema],
  relatedManifestations: [{
    type: Schema.Types.ObjectId,
    ref: 'Manifestation'
  }],
  relatedMilestones: [{
    type: Schema.Types.ObjectId,
    ref: 'Milestone'
  }],
  userProgress: [userProgressSchema]
});

// Apply core plugins
immersionSchema.plugin(timestampsPlugin);

// Apply tagging with weights
immersionSchema.plugin(taggableFlexWeightedPlugin, {
  field: 'weightedTags',
  allowedTypes: ['theme', 'goal', 'technique', 'emotion', 'life_area'],
  weightRange: { min: 0, max: 10 }
});

// Add instance methods
immersionSchema.methods.addUserProgress = function(userId, progressData = {}) {
  if (!this.userProgress) {
    this.userProgress = [];
  }
  
  // Check if user already has a progress record
  const existingProgress = this.userProgress.find(
    progress => progress.userId.toString() === userId.toString()
  );
  
  if (existingProgress) {
    // Update existing progress
    if (progressData.isCompleted && !existingProgress.isCompleted) {
      progressData.completedAt = new Date();
      
      // Also increment the completed count in engagement metrics
      if (!this.engagementMetrics) {
        this.engagementMetrics = {};
      }
      this.engagementMetrics.completedCount = (this.engagementMetrics.completedCount || 0) + 1;
    }
    
    // Add session duration if provided
    if (progressData.sessionDuration) {
      existingProgress.sessionDurations.push({
        startedAt: progressData.sessionStartedAt || new Date(),
        endedAt: new Date(),
        duration: progressData.sessionDuration
      });
      
      // Update average session time in engagement metrics
      const totalSessions = this.userProgress.reduce((sum, up) => sum + up.sessionDurations.length, 0);
      const totalDuration = this.userProgress.reduce((sum, up) => {
        return sum + up.sessionDurations.reduce((s, session) => s + (session.duration || 0), 0);
      }, 0);
      
      if (totalSessions > 0) {
        this.engagementMetrics.averageSessionTime = Math.round(totalDuration / totalSessions);
      }
    }
    
    // Update rating if provided
    if (progressData.rating && progressData.rating >= 1 && progressData.rating <= 5) {
      existingProgress.rating = progressData.rating;
      
      // Update rating average in engagement metrics
      const ratedProgress = this.userProgress.filter(up => up.rating);
      if (ratedProgress.length > 0) {
        const ratingSum = ratedProgress.reduce((sum, up) => sum + up.rating, 0);
        this.engagementMetrics.userRatings = {
          count: ratedProgress.length,
          average: parseFloat((ratingSum / ratedProgress.length).toFixed(1))
        };
      }
    }
    
    // Update other fields
    Object.keys(progressData).forEach(key => {
      if (key !== 'sessionDuration' && key !== 'sessionStartedAt') {
        existingProgress[key] = progressData[key];
      }
    });
  } else {
    // Create new progress entry
    const newProgress = {
      userId,
      startedAt: new Date(),
      isCompleted: progressData.isCompleted || false,
      sessionDurations: [],
      ...progressData
    };
    
    // Add session duration if provided
    if (progressData.sessionDuration) {
      newProgress.sessionDurations.push({
        startedAt: progressData.sessionStartedAt || new Date(),
        endedAt: new Date(),
        duration: progressData.sessionDuration
      });
    }
    
    // Add completedAt if completed
    if (newProgress.isCompleted) {
      newProgress.completedAt = new Date();
    }
    
    this.userProgress.push(newProgress);
    
    // Increment started count in engagement metrics
    if (!this.engagementMetrics) {
      this.engagementMetrics = {};
    }
    this.engagementMetrics.startedCount = (this.engagementMetrics.startedCount || 0) + 1;
    
    // Update completion rate
    if (this.engagementMetrics.startedCount > 0) {
      this.engagementMetrics.completionRate = Math.round(
        ((this.engagementMetrics.completedCount || 0) / this.engagementMetrics.startedCount) * 100
      );
    }
  }
  
  return this;
};

// Method to add media item
immersionSchema.methods.addMediaItem = function(mediaItem) {
  if (!this.media) {
    this.media = [];
  }
  
  this.media.push(mediaItem);
  return this;
};

// Method to link to manifestations
immersionSchema.methods.linkToManifestation = function(manifestationId) {
  if (!this.relatedManifestations) {
    this.relatedManifestations = [];
  }
  
  // Check if already linked
  if (!this.relatedManifestations.some(
    id => id.toString() === manifestationId.toString()
  )) {
    this.relatedManifestations.push(manifestationId);
  }
  
  return this;
};

// Method to link to milestones
immersionSchema.methods.linkToMilestone = function(milestoneId) {
  if (!this.relatedMilestones) {
    this.relatedMilestones = [];
  }
  
  // Check if already linked
  if (!this.relatedMilestones.some(
    id => id.toString() === milestoneId.toString()
  )) {
    this.relatedMilestones.push(milestoneId);
  }
  
  return this;
};

// Static method to find popular immersions
immersionSchema.statics.findPopular = function(limit = 10) {
  return this.find({
    'metadata.isPublic': true
  })
  .sort({
    'engagementMetrics.userRatings.average': -1,
    'engagementMetrics.completedCount': -1
  })
  .limit(limit);
};

// Static method to find immersions by type
immersionSchema.statics.findByType = function(type, limit = 10) {
  return this.find({
    type: type
  })
  .sort({
    createdAt: -1
  })
  .limit(limit);
};

// Create the model
export const Immersion = mongoose.model('Immersion', immersionSchema);

// Export schemas for use in other modules
export const schemas = {
  engagementMetricsSchema,
  metadataSchema,
  tagsSchema,
  mediaItemSchema,
  userProgressSchema,
  immersionSchema
};

export default { Immersion, schemas }; 