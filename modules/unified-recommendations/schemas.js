import mongoose from 'mongoose';
import { timestampsPlugin } from '../../config/shared-mongoose/plugins/timestamps.js';
import { taggableFlexWeightedPlugin } from '../../config/shared-mongoose/plugins/taggableFlexWeighted.js';
import { 
  TYPE_ENUMS, 
  STATUS_ENUMS, 
  CONTENT_TYPE_ENUMS,
  PRIORITY_ENUMS,
  CHANNEL_ENUMS
} from './constants.js';

const { Schema } = mongoose;

/**
 * Metadata Schema
 * Additional metadata for recommendations and notifications
 */
const metadataSchema = new Schema({
  priority: {
    type: String,
    enum: PRIORITY_ENUMS,
    default: 'Medium'
  },
  category: {
    type: String
  },
  tags: [{
    type: String
  }],
  expiresAt: {
    type: Date
  },
  deliveryChannels: [{
    type: String,
    enum: CHANNEL_ENUMS,
    default: ['In-App']
  }],
  requiresAction: {
    type: Boolean,
    default: false
  },
  actionText: {
    type: String
  },
  actionUrl: {
    type: String
  },
  iconUrl: {
    type: String
  },
  color: {
    type: String,
    default: '#4a6da7'
  }
}, { _id: false });

/**
 * Analytics Schema
 * Tracks user interaction with recommendations and notifications
 */
const analyticsSchema = new Schema({
  impressionCount: {
    type: Number,
    default: 0
  },
  firstSeenAt: {
    type: Date
  },
  lastSeenAt: {
    type: Date
  },
  clickedAt: {
    type: Date
  },
  dismissedAt: {
    type: Date
  },
  conversionTime: {
    type: Number // Time in milliseconds from first seen to acted upon
  },
  deliveryAttempts: {
    type: Number,
    default: 1
  },
  deliveryStatus: {
    type: String,
    enum: ['Pending', 'Delivered', 'Failed'],
    default: 'Pending'
  },
  channels: [{
    channel: String,
    sentAt: Date,
    deliveryStatus: String
  }]
}, { _id: false });

/**
 * Unified Recommendations and Notifications Schema
 * Manages content recommendations and notifications in a unified system
 */
const unifiedRecsAndNotifsSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: TYPE_ENUMS,
    required: true,
    index: true
  },
  contentType: {
    type: String,
    enum: CONTENT_TYPE_ENUMS,
    required: true
  },
  contentId: {
    type: Schema.Types.ObjectId,
    index: true
  },
  contentModel: {
    type: String
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: STATUS_ENUMS,
    default: 'Sent',
    index: true
  },
  additionalDetails: {
    type: Schema.Types.Mixed
  },
  metadata: {
    type: metadataSchema,
    default: () => ({})
  },
  analytics: {
    type: analyticsSchema,
    default: () => ({})
  },
  scheduledFor: {
    type: Date
  },
  recurrencePattern: {
    type: String
  },
  relatedEntries: [{
    type: Schema.Types.ObjectId,
    ref: 'UnifiedRecsAndNotifs'
  }],
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
});

// Apply core plugins
unifiedRecsAndNotifsSchema.plugin(timestampsPlugin);

// Apply tagging with weights
unifiedRecsAndNotifsSchema.plugin(taggableFlexWeightedPlugin, {
  field: 'weightedTags',
  allowedTypes: ['category', 'interest', 'relevance', 'priority'],
  weightRange: { min: 0, max: 10 }
});

// Add custom instance methods
unifiedRecsAndNotifsSchema.methods.markAsSeen = function() {
  if (this.status === 'Sent') {
    this.status = 'Seen';
    this.analytics.lastSeenAt = new Date();
    
    if (!this.analytics.firstSeenAt) {
      this.analytics.firstSeenAt = this.analytics.lastSeenAt;
    }
    
    this.analytics.impressionCount += 1;
    return this.save();
  }
  return Promise.resolve(this);
};

unifiedRecsAndNotifsSchema.methods.markAsActedUpon = function() {
  const now = new Date();
  this.status = 'Acted Upon';
  this.analytics.clickedAt = now;
  
  // Calculate conversion time if first seen is available
  if (this.analytics.firstSeenAt) {
    this.analytics.conversionTime = now - this.analytics.firstSeenAt;
  }
  
  return this.save();
};

unifiedRecsAndNotifsSchema.methods.dismiss = function() {
  this.status = 'Dismissed';
  this.analytics.dismissedAt = new Date();
  return this.save();
};

unifiedRecsAndNotifsSchema.methods.deactivate = function() {
  this.isActive = false;
  return this.save();
};

// Add static methods for finding and filtering
unifiedRecsAndNotifsSchema.statics.findActiveForUser = function(userId, options = {}) {
  const { type, limit = 20, skip = 0, sort = '-createdAt' } = options;
  
  const query = {
    userId,
    isActive: true
  };
  
  // Filter by type if specified
  if (type) {
    query.type = type;
  }
  
  // Filter by status if specified
  if (options.status) {
    query.status = options.status;
  }
  
  // Filter by contentType if specified
  if (options.contentType) {
    query.contentType = options.contentType;
  }
  
  return this.find(query)
    .sort(sort)
    .skip(skip)
    .limit(limit);
};

unifiedRecsAndNotifsSchema.statics.findRecentNotifications = function(userId, limit = 10) {
  return this.find({
    userId,
    type: 'Notification',
    isActive: true
  })
  .sort('-createdAt')
  .limit(limit);
};

unifiedRecsAndNotifsSchema.statics.findTopRecommendations = function(userId, limit = 10) {
  return this.find({
    userId,
    type: 'Recommendation',
    isActive: true,
    status: { $ne: 'Dismissed' }
  })
  .sort({ 'metadata.priority': -1, 'createdAt': -1 })
  .limit(limit);
};

unifiedRecsAndNotifsSchema.statics.countUnseenByType = function(userId, type) {
  return this.countDocuments({
    userId,
    type,
    status: 'Sent',
    isActive: true
  });
};

unifiedRecsAndNotifsSchema.statics.markAllAsSeenByType = function(userId, type) {
  const now = new Date();
  
  return this.updateMany(
    {
      userId,
      type,
      status: 'Sent',
      isActive: true
    },
    {
      $set: {
        status: 'Seen',
        'analytics.lastSeenAt': now,
        'analytics.firstSeenAt': { $cond: [{ $eq: ['$analytics.firstSeenAt', null] }, now, '$analytics.firstSeenAt'] }
      },
      $inc: { 'analytics.impressionCount': 1 }
    }
  );
};

// Create and export the model
export const UnifiedRecsAndNotifs = mongoose.model('UnifiedRecsAndNotifs', unifiedRecsAndNotifsSchema);

// Export schemas for use in other modules
export const schemas = {
  metadataSchema,
  analyticsSchema,
  unifiedRecsAndNotifsSchema
};

export default { UnifiedRecsAndNotifs, schemas }; 